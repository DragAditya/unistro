import { useState, useEffect, useCallback } from 'react'
import { X, Heart, Trash2, Download, ChevronLeft, ChevronRight, BookImage, Plus } from 'lucide-react'
import api from '../api'

function fmtSize(bytes) {
  if (!bytes) return '—'
  const k = 1024, s = ['B','KB','MB','GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + s[i]
}

function fmtDate(str) {
  if (!str) return '—'
  const d = new Date(str.replace(':', '-').replace(':', '-'))
  return isNaN(d) ? str : d.toLocaleDateString('en-US', { day:'numeric', month:'long', year:'numeric' })
}

export default function Lightbox({ photo, photos, onClose, onUpdate, onTrash, albums }) {
  const [fullUrl, setFullUrl]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [showAlbums, setShowAlbums] = useState(false)
  const [addMsg, setAddMsg]         = useState('')

  const idx    = photos.findIndex(p => p.id === photo.id)
  const hasPrev = idx > 0
  const hasNext = idx < photos.length - 1

  const nav = useCallback((dir) => {
    const target = photos[idx + dir]
    if (target) onUpdate({ ...target, _nav: true })
  }, [idx, photos, onUpdate])

  useEffect(() => {
    setFullUrl(null)
    setLoading(true)
    api.getFullUrl(photo.id)
      .then(url => { setFullUrl(url); setLoading(false) })
      .catch(() => setLoading(false))
  }, [photo.id])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft'  && hasPrev) nav(-1)
      if (e.key === 'ArrowRight' && hasNext) nav(1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, hasPrev, hasNext, nav])

  const toggleFav = async () => {
    const res = await api.toggleFav(photo.id)
    onUpdate({ ...photo, is_favorite: res.is_favorite })
  }

  const handleTrash = async () => {
    await api.trashPhoto(photo.id)
    onTrash(photo.id)
    if (hasNext) nav(1)
    else if (hasPrev) nav(-1)
    else onClose()
  }

  const handleDownload = () => {
    if (!fullUrl) return
    const a = document.createElement('a')
    a.href = fullUrl
    a.download = photo.filename
    a.click()
  }

  const addToAlbum = async (albumId) => {
    try {
      await api.addToAlbum(albumId, photo.id)
      setAddMsg('Added!')
      setTimeout(() => { setAddMsg(''); setShowAlbums(false) }, 1500)
    } catch {
      setAddMsg('Failed')
      setTimeout(() => setAddMsg(''), 1500)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 animate-fadeIn">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
          <X className="w-5 h-5 text-white"/>
        </button>

        <p className="text-sm text-white/60 font-medium truncate max-w-xs">{photo.filename}</p>

        <div className="flex items-center gap-1">
          {/* Album */}
          <div className="relative">
            <button onClick={() => setShowAlbums(s => !s)}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
              title="Add to album">
              <BookImage className="w-5 h-5 text-white/80"/>
            </button>
            {showAlbums && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-elevated border border-border rounded-xl shadow-2xl z-10 overflow-hidden animate-scaleIn">
                {albums && albums.length > 0 ? (
                  albums.map(a => (
                    <button key={a.id} onClick={() => addToAlbum(a.id)}
                      className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors">
                      {a.name}
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-muted">No albums yet</p>
                )}
                {addMsg && (
                  <div className="px-4 py-2 text-xs text-primary bg-primary/10 border-t border-border">
                    {addMsg}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Favorite */}
          <button onClick={toggleFav}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
            <Heart className={`w-5 h-5 ${photo.is_favorite ? 'fill-red-400 text-red-400' : 'text-white/80'}`}/>
          </button>

          {/* Download */}
          <button onClick={handleDownload}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
            <Download className="w-5 h-5 text-white/80"/>
          </button>

          {/* Trash */}
          <button onClick={handleTrash}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-danger/20 transition-colors">
            <Trash2 className="w-5 h-5 text-white/80 hover:text-danger"/>
          </button>
        </div>
      </div>

      {/* Image area */}
      <div className="flex-1 flex items-center relative min-h-0">
        {/* Prev */}
        {hasPrev && (
          <button onClick={() => nav(-1)}
            className="absolute left-3 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center
                       justify-center hover:bg-black/70 transition-colors">
            <ChevronLeft className="w-6 h-6 text-white"/>
          </button>
        )}

        {/* Image */}
        <div className="flex-1 flex items-center justify-center p-4 h-full">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <p className="text-white/40 text-sm">Loading from Telegram...</p>
            </div>
          ) : fullUrl ? (
            <img src={fullUrl} alt={photo.filename}
              className="max-h-full max-w-full object-contain rounded select-none animate-fadeIn"
              draggable={false}
            />
          ) : (
            <div className="text-center text-muted">
              <p>Failed to load photo</p>
            </div>
          )}
        </div>

        {/* Next */}
        {hasNext && (
          <button onClick={() => nav(1)}
            className="absolute right-3 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center
                       justify-center hover:bg-black/70 transition-colors">
            <ChevronRight className="w-6 h-6 text-white"/>
          </button>
        )}
      </div>

      {/* Bottom info */}
      <div className="flex items-center justify-center gap-6 px-4 py-3 border-t border-white/10">
        <InfoPill label="Date"    value={fmtDate(photo.taken_at || photo.uploaded_at)} />
        <InfoPill label="Size"    value={fmtSize(photo.file_size)} />
        <InfoPill label="Photo"   value={`${idx + 1} / ${photos.length}`} />
      </div>
    </div>
  )
}

function InfoPill({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-xs text-white/30 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-white/70 font-medium">{value}</p>
    </div>
  )
}
