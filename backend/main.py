import base64, io, os, secrets
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

import aiosqlite
from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image, ExifTags, ImageOps
from pydantic import BaseModel
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError
from telethon.tl.functions.channels import CreateChannelRequest
from telethon.tl.types import InputChannel
from dotenv import load_dotenv

load_dotenv()

API_ID   = int(os.getenv("TELEGRAM_API_ID", "0"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "")
DB_PATH  = os.getenv("DB_PATH", "unistro.db")
MAX_SIZE = 40 * 1024 * 1024

_clients: dict = {}
_pending: dict = {}

# ── DB ─────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def db():
    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        yield conn

async def init_db():
    async with db() as conn:
        await conn.executescript("""
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS users (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                phone               TEXT UNIQUE NOT NULL,
                session_string      TEXT NOT NULL,
                channel_id          INTEGER,
                channel_access_hash INTEGER,
                token               TEXT UNIQUE NOT NULL,
                created_at          TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS photos (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id         INTEGER NOT NULL REFERENCES users(id),
                telegram_msg_id INTEGER NOT NULL,
                filename        TEXT NOT NULL,
                file_size       INTEGER NOT NULL,
                taken_at        TEXT,
                uploaded_at     TEXT DEFAULT CURRENT_TIMESTAMP,
                thumbnail       BLOB,
                is_favorite     INTEGER DEFAULT 0,
                is_trashed      INTEGER DEFAULT 0,
                trashed_at      TEXT
            );
            CREATE TABLE IF NOT EXISTS albums (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL REFERENCES users(id),
                name        TEXT NOT NULL,
                created_at  TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS album_photos (
                album_id    INTEGER NOT NULL REFERENCES albums(id),
                photo_id    INTEGER NOT NULL REFERENCES photos(id),
                PRIMARY KEY (album_id, photo_id)
            );
        """)
        await conn.commit()

# ── Lifespan (FIX: replaces deprecated @app.on_event) ─────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="UniStro", lifespan=lifespan)

# ── CORS (FIX: allow_credentials=True with "*" is invalid per CORS spec) ──────
# Set ALLOWED_ORIGINS="https://your-frontend.vercel.app" in production

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,       # must be False when origins contains "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Utilities ──────────────────────────────────────────────────────────────────

def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()

async def require_user(token: Optional[str]):
    if not token:
        raise HTTPException(401, "Token required")
    async with db() as conn:
        row = await (await conn.execute(
            "SELECT * FROM users WHERE token = ?", (token,)
        )).fetchone()
    if not row:
        raise HTTPException(401, "Invalid or expired token")
    return row

async def get_client(token: str, session_string: str) -> TelegramClient:
    if token in _clients:
        c = _clients[token]
        if not c.is_connected():
            await c.connect()
        return c
    c = TelegramClient(StringSession(session_string), API_ID, API_HASH)
    await c.connect()
    _clients[token] = c
    return c

def make_thumb(data: bytes, size: int = 420) -> bytes:
    """
    FIX 1: ImageOps.exif_transpose() replaces private img._getexif()
            Works correctly for JPEG, PNG, WebP — no AttributeError.
    FIX 2: Image.Resampling.LANCZOS replaces deprecated Image.LANCZOS
    """
    img = Image.open(io.BytesIO(data)).convert("RGB")
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass
    img.thumbnail((size, size), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=72, optimize=True)
    return buf.getvalue()

def exif_date(data: bytes) -> Optional[str]:
    """
    FIX 1: img.getexif() replaces private img._getexif()
    FIX 2: Converts "2024:01:15 10:30:00" → "2024-01-15T10:30:00"
            so JavaScript Date() can actually parse it (was silently broken)
    """
    try:
        img  = Image.open(io.BytesIO(data))
        exif = img.getexif()
        if exif:
            for tag_id, val in exif.items():
                if ExifTags.TAGS.get(tag_id) == "DateTimeOriginal" and val:
                    parts = str(val).split(" ")
                    if len(parts) == 2:
                        return f"{parts[0].replace(':', '-')}T{parts[1]}"
    except Exception:
        pass
    return None

def b64thumb(blob) -> Optional[str]:
    if not blob:
        return None
    return "data:image/jpeg;base64," + base64.b64encode(bytes(blob)).decode()

def fmt_photo(r) -> dict:
    return {
        "id": r["id"], "filename": r["filename"],
        "file_size": r["file_size"], "taken_at": r["taken_at"],
        "uploaded_at": r["uploaded_at"],
        "thumbnail": b64thumb(r["thumbnail"]),
        "is_favorite": bool(r["is_favorite"]),
    }

# ── Auth ───────────────────────────────────────────────────────────────────────

class PhoneReq(BaseModel):
    phone: str

class VerifyReq(BaseModel):
    phone: str
    code: str
    phone_code_hash: str

class TwoFAReq(BaseModel):
    phone: str
    password: str

@app.post("/auth/send-code")
async def send_code(req: PhoneReq):
    if not API_ID or not API_HASH:
        raise HTTPException(500, "TELEGRAM_API_ID / TELEGRAM_API_HASH not set on server")
    c = TelegramClient(StringSession(), API_ID, API_HASH)
    await c.connect()
    try:
        result = await c.send_code_request(req.phone)
    except Exception as e:
        await c.disconnect()
        raise HTTPException(400, f"Telegram error: {e}")
    _pending[req.phone] = {"client": c}
    return {"phone_code_hash": result.phone_code_hash}

@app.post("/auth/verify")
async def verify(req: VerifyReq):
    if req.phone not in _pending:
        raise HTTPException(400, "No pending auth — send code first")
    c = _pending[req.phone]["client"]
    try:
        await c.sign_in(req.phone, req.code, phone_code_hash=req.phone_code_hash)
    except SessionPasswordNeededError:
        return {"requires_2fa": True}
    except PhoneCodeInvalidError:
        raise HTTPException(400, "Invalid code — try again")
    except Exception as e:
        raise HTTPException(400, f"Verification failed: {e}")
    return await _finish(req.phone, c)

@app.post("/auth/verify-2fa")
async def verify_2fa(req: TwoFAReq):
    if req.phone not in _pending:
        raise HTTPException(400, "Session expired — start over")
    c = _pending[req.phone]["client"]
    try:
        await c.sign_in(password=req.password)
    except Exception as e:
        raise HTTPException(400, f"2FA failed: {e}")
    return await _finish(req.phone, c)

async def _finish(phone: str, c: TelegramClient):
    """
    FIX: CreateChannelRequest (network call) is now OUTSIDE the DB context.
    Old code held an open SQLite connection during a slow Telegram API call.
    """
    session_string = c.session.save()
    token          = secrets.token_hex(32)

    # Quick read — close DB before making network call
    async with db() as conn:
        existing = await (await conn.execute(
            "SELECT channel_id, channel_access_hash FROM users WHERE phone = ?", (phone,)
        )).fetchone()

    # Network call with no DB connection held
    if existing and existing["channel_id"]:
        ch_id, ch_hash = existing["channel_id"], existing["channel_access_hash"]
    else:
        try:
            result = await c(CreateChannelRequest(
                title="UniStro Backup",
                about="UniStro photo backup — do not modify",
                megagroup=False,
            ))
            ch      = result.chats[0]
            ch_id   = ch.id
            ch_hash = ch.access_hash
        except Exception as e:
            raise HTTPException(500, f"Could not create Telegram channel: {e}")

    async with db() as conn:
        await conn.execute("""
            INSERT INTO users (phone, session_string, token, channel_id, channel_access_hash)
            VALUES (?,?,?,?,?)
            ON CONFLICT(phone) DO UPDATE SET
                session_string      = excluded.session_string,
                token               = excluded.token,
                channel_id          = COALESCE(users.channel_id, excluded.channel_id),
                channel_access_hash = COALESCE(users.channel_access_hash, excluded.channel_access_hash)
        """, (phone, session_string, token, ch_id, ch_hash))
        await conn.commit()

    _clients[token] = c
    _pending.pop(phone, None)
    return {"token": token}

@app.post("/auth/logout")
async def logout(authorization: str = Header(None)):
    if authorization and authorization in _clients:
        c = _clients.pop(authorization)
        try:
            await c.disconnect()
        except Exception:
            pass
    return {"ok": True}

# ── Photos ─────────────────────────────────────────────────────────────────────

@app.post("/photos/upload")
async def upload_photo(file: UploadFile = File(...), authorization: str = Header(None)):
    user = await require_user(authorization)

    if not user["channel_id"]:
        raise HTTPException(503, "Storage not ready — log out and back in")

    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "Only image files allowed")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(413, "File too large — max 40 MB")

    thumb    = make_thumb(data)
    taken_at = exif_date(data)

    c       = await get_client(authorization, user["session_string"])
    channel = InputChannel(user["channel_id"], user["channel_access_hash"])
    buf      = io.BytesIO(data)
    buf.name = file.filename or "photo.jpg"

    try:
        msg = await c.send_file(channel, buf, caption=file.filename, force_document=False)
    except Exception as e:
        raise HTTPException(502, f"Telegram upload failed: {e}")

    async with db() as conn:
        cur = await conn.execute(
            "INSERT INTO photos (user_id,telegram_msg_id,filename,file_size,taken_at,thumbnail) VALUES(?,?,?,?,?,?)",
            (user["id"], msg.id, file.filename or "photo.jpg", len(data), taken_at, thumb)
        )
        await conn.commit()

    return {
        "id": cur.lastrowid, "filename": file.filename or "photo.jpg",
        "file_size": len(data), "taken_at": taken_at,
        "uploaded_at": utcnow(), "thumbnail": b64thumb(thumb), "is_favorite": False,
    }

@app.get("/photos")
async def list_photos(
    page: int = 1, limit: int = 60,
    search: Optional[str] = None,
    favorites_only: bool = False,
    authorization: str = Header(None),
):
    user   = await require_user(authorization)
    offset = (page - 1) * limit
    where  = ["user_id = ?", "is_trashed = 0"]
    params: list = [user["id"]]

    if search:
        where.append("filename LIKE ?")
        params.append(f"%{search}%")
    if favorites_only:
        where.append("is_favorite = 1")

    clause = " AND ".join(where)

    async with db() as conn:
        total = (await (await conn.execute(
            f"SELECT COUNT(*) FROM photos WHERE {clause}", params
        )).fetchone())[0]

        rows = await (await conn.execute(
            f"""SELECT id,filename,file_size,taken_at,uploaded_at,thumbnail,is_favorite
                FROM photos WHERE {clause}
                ORDER BY COALESCE(taken_at,uploaded_at) DESC LIMIT ? OFFSET ?""",
            params + [limit, offset]
        )).fetchall()

    return {"photos": [fmt_photo(r) for r in rows], "total": total, "page": page,
            "pages": max(1, (total + limit - 1) // limit)}

@app.get("/photos/{photo_id}/full")
async def get_full_photo(photo_id: int, authorization: str = Header(None)):
    user = await require_user(authorization)
    if not user["channel_id"]:
        raise HTTPException(503, "Storage not configured")

    async with db() as conn:
        row = await (await conn.execute(
            "SELECT telegram_msg_id,filename FROM photos WHERE id=? AND user_id=? AND is_trashed=0",
            (photo_id, user["id"])
        )).fetchone()
    if not row:
        raise HTTPException(404, "Photo not found")

    c       = await get_client(authorization, user["session_string"])
    channel = InputChannel(user["channel_id"], user["channel_access_hash"])
    try:
        msg = await c.get_messages(channel, ids=row["telegram_msg_id"])
    except Exception as e:
        raise HTTPException(502, f"Telegram error: {e}")

    if not msg or not msg.media:
        raise HTTPException(404, "Media missing on Telegram")

    buf = io.BytesIO()
    await c.download_media(msg, buf)
    buf.seek(0)

    fname = row["filename"] or "photo.jpg"
    ext   = fname.rsplit(".", 1)[-1].lower() if "." in fname else "jpg"
    mime  = {"jpg":"jpeg","jpeg":"jpeg","png":"png","webp":"webp","gif":"gif"}.get(ext, "jpeg")

    return StreamingResponse(buf, media_type=f"image/{mime}",
        headers={"Cache-Control":"private, max-age=3600",
                 "Content-Disposition": f'inline; filename="{fname}"'})

@app.patch("/photos/{photo_id}/favorite")
async def toggle_favorite(photo_id: int, authorization: str = Header(None)):
    user = await require_user(authorization)
    async with db() as conn:
        # FIX: "1 - is_favorite" is explicit and safe; "NOT is_favorite" can be ambiguous
        await conn.execute(
            "UPDATE photos SET is_favorite = 1 - is_favorite WHERE id=? AND user_id=?",
            (photo_id, user["id"])
        )
        await conn.commit()
        row = await (await conn.execute(
            "SELECT is_favorite FROM photos WHERE id=? AND user_id=?", (photo_id, user["id"])
        )).fetchone()
    if not row:
        raise HTTPException(404, "Photo not found")
    return {"is_favorite": bool(row["is_favorite"])}

@app.delete("/photos/{photo_id}")
async def trash_photo(photo_id: int, authorization: str = Header(None)):
    user = await require_user(authorization)
    async with db() as conn:
        result = await conn.execute(
            "UPDATE photos SET is_trashed=1, trashed_at=? WHERE id=? AND user_id=? AND is_trashed=0",
            (utcnow(), photo_id, user["id"])
        )
        await conn.commit()
    if result.rowcount == 0:
        raise HTTPException(404, "Photo not found")
    return {"ok": True}

# ── Trash ──────────────────────────────────────────────────────────────────────

@app.get("/trash")
async def get_trash(authorization: str = Header(None)):
    user = await require_user(authorization)
    async with db() as conn:
        rows = await (await conn.execute(
            "SELECT id,filename,file_size,uploaded_at,thumbnail,trashed_at FROM photos "
            "WHERE user_id=? AND is_trashed=1 ORDER BY trashed_at DESC",
            (user["id"],)
        )).fetchall()
    return {"photos": [{
        "id":r["id"],"filename":r["filename"],"file_size":r["file_size"],
        "uploaded_at":r["uploaded_at"],"trashed_at":r["trashed_at"],
        "thumbnail":b64thumb(r["thumbnail"]),
    } for r in rows]}

@app.post("/trash/{photo_id}/restore")
async def restore_photo(photo_id: int, authorization: str = Header(None)):
    user = await require_user(authorization)
    async with db() as conn:
        result = await conn.execute(
            "UPDATE photos SET is_trashed=0,trashed_at=NULL WHERE id=? AND user_id=? AND is_trashed=1",
            (photo_id, user["id"])
        )
        await conn.commit()
    if result.rowcount == 0:
        raise HTTPException(404, "Photo not found in trash")
    return {"ok": True}

@app.delete("/trash/{photo_id}/permanent")
async def delete_forever(photo_id: int, authorization: str = Header(None)):
    user = await require_user(authorization)
    if not user["channel_id"]:
        raise HTTPException(503, "Storage not configured")

    async with db() as conn:
        row = await (await conn.execute(
            "SELECT telegram_msg_id FROM photos WHERE id=? AND user_id=?",
            (photo_id, user["id"])
        )).fetchone()
    if not row:
        raise HTTPException(404, "Photo not found")

    c       = await get_client(authorization, user["session_string"])
    channel = InputChannel(user["channel_id"], user["channel_access_hash"])
    try:
        await c.delete_messages(channel, [row["telegram_msg_id"]])
    except Exception:
        pass   # Clean up DB regardless

    async with db() as conn:
        await conn.execute("DELETE FROM album_photos WHERE photo_id=?", (photo_id,))
        await conn.execute("DELETE FROM photos WHERE id=? AND user_id=?", (photo_id, user["id"]))
        await conn.commit()
    return {"ok": True}

# ── Albums ─────────────────────────────────────────────────────────────────────

class AlbumReq(BaseModel):
    name: str

@app.get("/albums")
async def list_albums(authorization: str = Header(None)):
    user = await require_user(authorization)
    async with db() as conn:
        rows = await (await conn.execute("""
            SELECT a.id, a.name, a.created_at, COUNT(ap.photo_id) AS count,
                   (SELECT p.thumbnail FROM photos p JOIN album_photos ap2 ON p.id=ap2.photo_id
                    WHERE ap2.album_id=a.id ORDER BY p.uploaded_at DESC LIMIT 1) AS cover
            FROM albums a LEFT JOIN album_photos ap ON a.id=ap.album_id
            WHERE a.user_id=? GROUP BY a.id ORDER BY a.created_at DESC
        """, (user["id"],))).fetchall()
    return {"albums": [{
        "id":r["id"],"name":r["name"],"created_at":r["created_at"],
        "photo_count":r["count"],"cover":b64thumb(r["cover"]) if r["cover"] else None,
    } for r in rows]}

@app.post("/albums")
async def create_album(req: AlbumReq, authorization: str = Header(None)):
    user = await require_user(authorization)
    if not req.name.strip():
        raise HTTPException(400, "Album name required")
    async with db() as conn:
        cur = await conn.execute(
            "INSERT INTO albums (user_id,name) VALUES(?,?)", (user["id"], req.name.strip())
        )
        await conn.commit()
    return {"id":cur.lastrowid,"name":req.name.strip(),"photo_count":0,"cover":None,"created_at":utcnow()}

@app.delete("/albums/{album_id}")
async def delete_album(album_id: int, authorization: str = Header(None)):
    user = await require_user(authorization)
    async with db() as conn:
        await conn.execute("DELETE FROM album_photos WHERE album_id=?", (album_id,))
        result = await conn.execute("DELETE FROM albums WHERE id=? AND user_id=?", (album_id, user["id"]))
        await conn.commit()
    if result.rowcount == 0:
        raise HTTPException(404, "Album not found")
    return {"ok": True}

@app.get("/albums/{album_id}")
async def get_album(album_id: int, authorization: str = Header(None)):
    user = await require_user(authorization)
    async with db() as conn:
        album = await (await conn.execute(
            "SELECT * FROM albums WHERE id=? AND user_id=?", (album_id, user["id"])
        )).fetchone()
        if not album:
            raise HTTPException(404, "Album not found")
        rows = await (await conn.execute("""
            SELECT p.id,p.filename,p.file_size,p.taken_at,p.uploaded_at,p.thumbnail,p.is_favorite
            FROM photos p JOIN album_photos ap ON p.id=ap.photo_id
            WHERE ap.album_id=? AND p.is_trashed=0
            ORDER BY COALESCE(p.taken_at,p.uploaded_at) DESC
        """, (album_id,))).fetchall()
    return {"album":{"id":album["id"],"name":album["name"]},"photos":[fmt_photo(r) for r in rows]}

@app.post("/albums/{album_id}/photos")
async def add_to_album(album_id: int, photo_id: int, authorization: str = Header(None)):
    user = await require_user(authorization)
    async with db() as conn:
        if not await (await conn.execute(
            "SELECT id FROM albums WHERE id=? AND user_id=?", (album_id, user["id"])
        )).fetchone():
            raise HTTPException(404, "Album not found")
        if not await (await conn.execute(
            "SELECT id FROM photos WHERE id=? AND user_id=? AND is_trashed=0", (photo_id, user["id"])
        )).fetchone():
            raise HTTPException(404, "Photo not found")
        await conn.execute(
            "INSERT OR IGNORE INTO album_photos (album_id,photo_id) VALUES(?,?)", (album_id, photo_id)
        )
        await conn.commit()
    return {"ok": True}

@app.delete("/albums/{album_id}/photos/{photo_id}")
async def remove_from_album(album_id: int, photo_id: int, authorization: str = Header(None)):
    user = await require_user(authorization)
    async with db() as conn:
        if not await (await conn.execute(
            "SELECT id FROM albums WHERE id=? AND user_id=?", (album_id, user["id"])
        )).fetchone():
            raise HTTPException(404, "Album not found")
        await conn.execute(
            "DELETE FROM album_photos WHERE album_id=? AND photo_id=?", (album_id, photo_id)
        )
        await conn.commit()
    return {"ok": True}

# ── Stats ──────────────────────────────────────────────────────────────────────

@app.get("/stats")
async def get_stats(authorization: str = Header(None)):
    user = await require_user(authorization)
    async with db() as conn:
        row = await (await conn.execute(
            "SELECT COUNT(*),SUM(file_size),SUM(is_favorite) FROM photos WHERE user_id=? AND is_trashed=0",
            (user["id"],)
        )).fetchone()
        trash = (await (await conn.execute(
            "SELECT COUNT(*) FROM photos WHERE user_id=? AND is_trashed=1", (user["id"],)
        )).fetchone())[0]
    return {"total_photos":row[0] or 0,"total_size":row[1] or 0,"favorites":row[2] or 0,"trash":trash}

# ── Health (for Render uptime checks + UptimeRobot) ───────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "UniStro"}
