# UniStro — Complete Setup & Hosting Guide 📸

---

## Step 0 — Get Telegram API Credentials (required first)

1. Open https://my.telegram.org in browser
2. Log in with your phone number
3. Click **"API development tools"**
4. Fill the form (any app name, any platform)
5. Copy your **API ID** (number) and **API Hash** (32-char hex string)

⚠️ Keep these secret — they give access to your Telegram account.

---

## Option A — Run Locally (Fastest)

### Backend

```bash
cd backend

# Copy and fill env file
cp .env.example .env
# Edit .env: add TELEGRAM_API_ID and TELEGRAM_API_HASH

# Install Python deps
pip install -r requirements.txt

# Start server (auto-reloads on file change)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend

# Install Node deps
npm install

# Start dev server
npm run dev
```

Open **http://localhost:5173** — you're live ✅

---

## Option B — Docker (One Command, Cleanest)

```bash
# 1. Create root .env file
cp backend/.env.example .env
# Edit .env with your API_ID and API_HASH

# 2. Run everything
docker-compose up --build
```

- Frontend → http://localhost:3000
- Backend  → http://localhost:8000
- DB is persisted at ./data/unistro.db

To stop: `docker-compose down`
To reset data: `docker-compose down -v`

---

## Option C — Deploy to Render (Free, Cloud) ⭐ Recommended

Render has a generous free tier. The backend stays awake as long as someone
pings it (use UptimeRobot for this — see below).

### Step 1 — Deploy Backend on Render

1. Push your project to GitHub
2. Go to https://render.com → New → **Web Service**
3. Connect your GitHub repo
4. Configure:

| Setting          | Value                                      |
|------------------|--------------------------------------------|
| Root Directory   | `backend`                                  |
| Runtime          | **Python 3**                               |
| Build Command    | `pip install -r requirements.txt`          |
| Start Command    | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Instance Type    | **Free**                                   |

5. Add Environment Variables:

| Key                | Value                          |
|--------------------|--------------------------------|
| `TELEGRAM_API_ID`  | your API ID number             |
| `TELEGRAM_API_HASH`| your API hash string           |
| `DB_PATH`          | `/opt/render/project/src/unistro.db` |

6. Click **"Create Web Service"**
7. Copy your backend URL — looks like `https://unistro-api.onrender.com`

> ⚠️ **Important for Render free tier**: SQLite DB lives on the ephemeral
> disk — data resets on redeploy. For production use, upgrade to Render's
> $7/mo plan with a persistent disk, or switch to PostgreSQL.

### Step 2 — Deploy Frontend on Vercel (Free)

1. Go to https://vercel.com → New Project
2. Import your GitHub repo
3. Configure:

| Setting            | Value                                      |
|--------------------|--------------------------------------------|
| Framework Preset   | **Vite**                                   |
| Root Directory     | `frontend`                                 |
| Build Command      | `npm run build`                            |
| Output Directory   | `dist`                                     |

4. Add Environment Variable:

| Key             | Value                                              |
|-----------------|----------------------------------------------------|
| `VITE_API_URL`  | `https://your-unistro-api.onrender.com`           |

5. Click **Deploy**
6. Your app is live at `https://unistro.vercel.app`

### Step 3 — Fix CORS for Production

In Render backend env vars, add:

```
ALLOWED_ORIGINS=https://your-unistro-app.vercel.app
```

### Step 4 — Keep Render Free Tier Awake (UptimeRobot)

Render free tier sleeps after 15 min of inactivity.
Fix: set up a free uptime monitor.

1. Go to https://uptimerobot.com → Sign up free
2. Add New Monitor:
   - Type: **HTTP(s)**
   - URL: `https://your-api.onrender.com/health`
   - Interval: **5 minutes**
3. Done — your backend now stays awake 24/7 ✅

---

## Option D — Deploy to Fly.io (Better Free Tier for Backend)

Fly.io has persistent volumes and doesn't sleep on free tier.

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# From backend/ directory
cd backend
fly launch
# Choose: app name, region (closest to you), no postgres needed

# Set secrets
fly secrets set TELEGRAM_API_ID=your_id
fly secrets set TELEGRAM_API_HASH=your_hash
fly secrets set DB_PATH=/data/unistro.db

# Create persistent volume for SQLite
fly volumes create unistro_data --size 1  # 1 GB free

# Deploy
fly deploy
```

Add to `fly.toml` for persistent volume:
```toml
[mounts]
  source = "unistro_data"
  destination = "/data"
```

---

## Option E — Self-Host on a VPS (Full Control)

Works on any Ubuntu/Debian VPS (DigitalOcean $4/mo, Hetzner €3/mo, etc.)

```bash
# On your server

# Install deps
sudo apt update && sudo apt install -y python3 python3-pip nodejs npm nginx certbot

# Clone your repo
git clone https://github.com/yourusername/unistro.git
cd unistro

# Backend setup
cd backend
pip3 install -r requirements.txt
cp .env.example .env
nano .env   # Add your Telegram API credentials

# Test run
uvicorn main:app --host 127.0.0.1 --port 8000

# Create systemd service for auto-restart
sudo nano /etc/systemd/system/unistro.service
```

Paste this in the service file:
```ini
[Unit]
Description=UniStro Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/unistro/backend
Environment="PATH=/home/ubuntu/.local/bin"
ExecStart=/home/ubuntu/.local/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable unistro
sudo systemctl start unistro

# Build frontend
cd ../frontend
npm install
VITE_API_URL=https://yourdomain.com/api npm run build

# Configure nginx
sudo nano /etc/nginx/sites-available/unistro
```

Nginx config:
```nginx
server {
    server_name yourdomain.com;

    # Frontend
    location / {
        root /home/ubuntu/unistro/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 45M;
    }

    listen 80;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/unistro /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Add HTTPS (free SSL)
sudo certbot --nginx -d yourdomain.com
```

---

## Option F — Railway (Easiest Deploy, $5/mo after free trial)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# From project root
railway init
railway up

# Set env vars
railway variables set TELEGRAM_API_ID=your_id
railway variables set TELEGRAM_API_HASH=your_hash
```

---

## Hosting Comparison

| Platform     | Free Tier | Sleeps? | Persistent DB | Best For            |
|--------------|-----------|---------|---------------|---------------------|
| Render       | ✅ Yes    | ✅ Yes  | ❌ No*        | Quick demo          |
| Vercel       | ✅ Yes    | No      | N/A (frontend)| Frontend only       |
| Fly.io       | ✅ Yes    | ❌ No   | ✅ Yes        | Best free backend   |
| Railway      | Trial     | ❌ No   | ✅ Yes        | Easiest overall     |
| VPS          | Paid      | ❌ No   | ✅ Yes        | Full control        |

*Render free tier: use UptimeRobot ping + back up DB periodically.

---

## Recommended Stack for Best Experience

```
Frontend  → Vercel      (free, fast CDN, auto-deploys on push)
Backend   → Fly.io      (free, persistent volume, no sleep)
Database  → SQLite on Fly.io volume
```

Or if you want zero config:
```
Frontend + Backend → Railway (one repo, one deploy)
```

---

## Environment Variables Reference

### Backend (.env)

| Variable          | Required | Description                                    |
|-------------------|----------|------------------------------------------------|
| TELEGRAM_API_ID   | ✅       | From my.telegram.org                           |
| TELEGRAM_API_HASH | ✅       | From my.telegram.org                           |
| DB_PATH           | ❌       | SQLite file path (default: unistro.db)         |
| ALLOWED_ORIGINS   | ❌       | CORS origins (default: * for dev)              |

### Frontend (.env or Vercel env)

| Variable      | Required | Description                             |
|---------------|----------|-----------------------------------------|
| VITE_API_URL  | ✅ prod  | Backend URL (default: localhost:8000)   |

---

## Troubleshooting

**"TELEGRAM_API_ID / API_HASH not set"**
→ Check your .env file is saved and the server restarted.

**"Could not create Telegram channel"**
→ Telegram limits channel creation. Wait 10 min and try again.

**Photos upload but don't appear**
→ Check VITE_API_URL is set correctly in frontend and CORS is configured.

**Render backend is slow first request**
→ Free tier sleeps — set up UptimeRobot to ping /health every 5 min.

**"Media missing on Telegram"**
→ The message was deleted from the Telegram channel manually.
   Never delete messages from the UniStro Backup channel manually.

**SQLite locked errors**
→ Only run 1 worker (--workers 1). WAL mode is already enabled in the code.

---

## Security Notes for Production

- Change `ALLOWED_ORIGINS` from `*` to your exact frontend URL
- Back up your SQLite DB periodically (`cp unistro.db unistro.db.bak`)
- Don't share your Telegram API credentials
- The UniStro Backup Telegram channel should be kept private
