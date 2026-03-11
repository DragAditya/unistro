import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Upload, RotateCcw, Trash2, Plus, FolderOpen, X, Menu } from 'lucide-react'
import api from '../api'
import Sidebar from '../components/Sidebar.jsx'
import PhotoGrid from '../components/PhotoGrid.jsx'
import Lightbox from '../components/Lightbox.jsx'
import UploadZone from '../components/UploadZone.jsx'

export default function Gallery({ onLogout }) {
  const [view, setView]             = useState('photos')   // photos | favorites | albums | album:ID | trash
  const [photos, setPhotos]         = useState([])
  const [albumPhotos, setAlbumPhotos] = useState([])
  const [albums, setAlbums]         = useState([])
  const [trash, setTrash]           = useState([])
  const [stats, setStats]           = useState(null)
  const [loading, setLoading]       = useState(false)
  const [lightbox, setLightbox]     = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [search, setSearch]         = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [newAlbumName, setNewAlbumName] = useState('')
  const [creatingAlbum, setCreatingAlbum] = useState(false)
  const [currentAlbum, setCurrentAlbum] = useState(null)
  const searchTimeout = useRef()

  const loadStats = useCallback(async () => {
    try { setStats(await api.getStats()) } catch {}
  }, [])

  const loadPhotos = useCallback(async (q = '') => {
    setLoading(true)
    try {
      const params = { page: 1, limit: 200 }
      if (q) params.search = q
      if (view === 'favorites') params.favorites_only = true
      const res = await api.getPhotos(params)
      setPhotos(res.photos || [])
    } catch { setPhotos([]) }
    finally { setLoading(false) }
  }, [view])

  const loadAlbums = useCallback(async () => {
    try { setAlbums((await api.getAlbums()).albums || []) } catch {}
  }, [])

  const loadTrash = useCallback(async () => {
    setLoading(true)
    try { setTrash((await api.getTrash()).photos || []) }
    catch { setTrash([]) }
    finally { setLoading(false) }
  }, [])

  const loadAlbumPhotos = useCallback(async (id) => {
    setLoading(true)
    try {
      const res = await api.getAlbum(id)
      setAlbumPhotos(res.photos || [])
      setCurrentAlbum(res.album)
    } catch { setAlbumPhotos([]) }
    finally { setLoading(false) }
  }, [])

  // Load data on view change
  useEffect(() => {
    loadStats()
    loadAlbums()
    if (view === 'trash') {
      loadTrash()
    } else if (view.startsWith('album:')) {
      loadAlbumPhotos(view.split(':')[1])
    } else {
      loadPhotos(search)
    }
  }, [view])

  // Search debounce
  useEffect(() => {
    clearTimeout(searchTimeout.current)
    if (view !== 'photos' && view !== 'favorites') return
    searchTimeout.current = setTimeout(() => loadPhotos(search), 400)
    return () => clearTimeout(searchTimeout.current)
  }, [search])

  const setViewAndClear = (v) => {
    setView(v)
    setSearch('')
    setLightbox(null)
  }

  // Toggle favorite (optimistic update)
  const handleToggleFav = async (photo) => {
    const update = (list) => list.map(p => p.id === photo.id ? { ...p, is_favorite: !p.is_favorite } : p)
    setPhotos(update)
    setAlbumPhotos(update)
    await api.toggleFav(photo.id)
    loadStats()
  }

  // Trash (remove from list)
  const handleTrash = async (photo) => {
    await api.trashPhoto(photo.id)
    setPhotos(p => p.filter(x => x.id !== photo.id))
    setAlbumPhotos(p => p.filter(x => x.id !== photo.id))
    loadStats()
  }

  // Restore from trash
  const handleRestore = async (photo) => {
    await api.restorePhoto(photo.id)
    setTrash(t => t.filter(x => x.id !== photo.id))
    loadStats()
  }

  // Delete forever
  const handleDeleteForever = async (photo) => {
    await api.deleteForever(photo.id)
    setTrash(t => t.filter(x => x.id !== photo.id))
    loadStats()
  }

  // Upload callback
  const handleUploaded = (photo) => {
    setPhotos(p => [photo, ...p])
    loadStats()
  }

  // Lightbox update (nav + fav)
  const handleLightboxUpdate = (photo) => {
    if (photo._nav) {
      setLightbox(photo)
    } else {
      const update = (list) => list.map(p => p.id === photo.id ? photo : p)
      setPhotos(update)
      setAlbumPhotos(update)
      setLightbox(photo)
    }
  }

  // Create album
  const createAlbum = async (e) => {
    e.preventDefault()
    if (!newAlbumName.trim()) return
    setCreatingAlbum(true)
    try {
      const album = await api.createAlbum(newAlbumName.trim())
      setAlbums(a => [album, ...a])
      setNewAlbumName('')
    } catch {}
    finally { setCreatingAlbum(false) }
  }

  // Delete album
  const deleteAlbum = async (id) => {
    if (!confirm('Delete this album? Photos won\'t be deleted.')) return
    await api.deleteAlbum(id)
    setAlbums(a => a.filter(x => x.id !== id))
  }

  // Active photo list for lightbox
  const activePhotos = view.startsWith('album:') ? albumPhotos : photos

  const viewTitle = view === 'photos'    ? 'Photos'
                  : view === 'favorites' ? 'Favorites'
                  : view === 'albums'    ? 'Albums'
                  : view === 'trash'     ? 'Trash'
                  : currentAlbum?.name  || 'Album'

  const showSearch  = view === 'photos' || view === 'favorites'
  const showUploadBtn = view !== 'trash'

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Desktop sidebar */}
      <div className="hidden sm:flex">
        <Sidebar view={view} onView={setViewAndClear} stats={stats} onLogout={onLogout}
          collapsed={!sidebarOpen} />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface/80 backdrop-blur-sm flex-shrink-0">
          {/* Mobile menu / Desktop sidebar toggle */}
          <button onClick={() => setSidebarOpen(s => !s)}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-elevated transition-colors">
            <Menu className="w-5 h-5 text-muted"/>
          </button>

          <h1 className="text-white font-semibold text-base sm:text-lg flex-shrink-0">{viewTitle}</h1>

          {/* Search */}
          {showSearch && (
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"/>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search photos..."
                className="w-full bg-elevated border border-border rounded-xl pl-9 pr-9 py-2 text-sm
                           text-white placeholder-muted/50 focus:outline-none focus:border-primary/50 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-muted hover:text-white transition-colors"/>
                </button>
              )}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {showUploadBtn && (
              <button onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-bg text-sm font-semibold
                           rounded-xl hover:opacity-90 active:scale-95 transition-all">
                <Upload className="w-4 h-4"/>
                <span className="hidden sm:block">Upload</span>
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 pt-4">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <svg className="animate-spin h-7 w-7 text-primary" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          )}

          {/* Photos / Favorites */}
          {!loading && (view === 'photos' || view === 'favorites') && (
            <PhotoGrid
              photos={photos}
              onPhotoClick={setLightbox}
              onToggleFav={handleToggleFav}
              onTrash={handleTrash}
              emptyMsg={view === 'favorites' ? 'No favorites yet — heart some photos!' : 'No photos yet — upload some!'}
            />
          )}

          {/* Album photos */}
          {!loading && view.startsWith('album:') && (
            <div>
              {currentAlbum && (
                <div className="flex items-center gap-3 mb-4">
                  <button onClick={() => setViewAndClear('albums')}
                    className="text-muted hover:text-white text-sm transition-colors">
                    ← Albums
                  </button>
                  <span className="text-muted">/</span>
                  <span className="text-white text-sm font-medium">{currentAlbum.name}</span>
                </div>
              )}
              <PhotoGrid
                photos={albumPhotos}
                onPhotoClick={setLightbox}
                onToggleFav={handleToggleFav}
                onTrash={handleTrash}
                emptyMsg="This album is empty"
              />
            </div>
          )}

          {/* Albums grid */}
          {!loading && view === 'albums' && (
            <div>
              {/* Create album */}
              <form onSubmit={createAlbum} className="flex gap-2 mb-6 max-w-sm">
                <input
                  value={newAlbumName}
                  onChange={e => setNewAlbumName(e.target.value)}
                  placeholder="New album name..."
                  className="flex-1 bg-elevated border border-border rounded-xl px-3 py-2 text-sm
                             text-white placeholder-muted/50 focus:outline-none focus:border-primary/50 transition-all"
                />
                <button type="submit" disabled={creatingAlbum || !newAlbumName.trim()}
                  className="px-3 py-2 bg-primary text-bg text-sm font-medium rounded-xl
                             hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5">
                  <Plus className="w-4 h-4"/>
                  Create
                </button>
              </form>

              {albums.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted">
                  <FolderOpen className="w-12 h-12 mb-3 opacity-30"/>
                  <p className="text-sm">No albums yet</p>
                </div>
              ) : (
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                  {albums.map(album => (
                    <AlbumCard key={album.id} album={album}
                      onClick={() => setViewAndClear(`album:${album.id}`)}
                      onDelete={() => deleteAlbum(album.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Trash */}
          {!loading && view === 'trash' && (
            <div>
              {trash.length > 0 && (
                <p className="text-xs text-muted mb-4">
                  Items are permanently deleted after 30 days.
                </p>
              )}
              {trash.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted">
                  <Trash2 className="w-12 h-12 mb-3 opacity-30"/>
                  <p className="text-sm">Trash is empty</p>
                </div>
              ) : (
                <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                  {trash.map(photo => (
                    <TrashCard key={photo.id} photo={photo}
                      onRestore={() => handleRestore(photo)}
                      onDelete={() => handleDeleteForever(photo)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Mobile bottom nav */}
        <nav className="flex sm:hidden items-center justify-around px-2 py-2 border-t border-border bg-surface/90 backdrop-blur-sm">
          {[
            { id:'photos',    label:'Photos',    emoji:'🖼️' },
            { id:'favorites', label:'Favorites', emoji:'❤️' },
            { id:'albums',    label:'Albums',    emoji:'📁' },
            { id:'trash',     label:'Trash',     emoji:'🗑️' },
          ].map(({ id, label, emoji }) => (
            <button key={id} onClick={() => setViewAndClear(id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all
                ${view === id || (view.startsWith('album:') && id === 'albums')
                  ? 'text-primary'
                  : 'text-muted hover:text-white'
                }`}>
              <span className="text-xl">{emoji}</span>
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
          <button onClick={onLogout}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted hover:text-danger transition-colors">
            <span className="text-xl">👋</span>
            <span className="text-xs font-medium">Out</span>
          </button>
        </nav>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          photo={lightbox}
          photos={activePhotos}
          onClose={() => setLightbox(null)}
          onUpdate={handleLightboxUpdate}
          onTrash={(id) => {
            handleTrash({ id })
            setLightbox(null)
          }}
          albums={albums}
        />
      )}

      {/* Upload zone */}
      {showUpload && (
        <UploadZone
          onUploaded={handleUploaded}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  )
}

function AlbumCard({ album, onClick, onDelete }) {
  return (
    <div className="relative group cursor-pointer" onClick={onClick}>
      <div className="aspect-square rounded-xl overflow-hidden bg-elevated border border-border hover:border-primary/40 transition-all">
        {album.cover ? (
          <img src={album.cover} alt={album.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FolderOpen className="w-10 h-10 text-muted/40"/>
          </div>
        )}
      </div>
      <div className="mt-1.5 px-0.5">
        <p className="text-sm text-white font-medium truncate">{album.name}</p>
        <p className="text-xs text-muted">{album.photo_count} photo{album.photo_count !== 1 ? 's' : ''}</p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center
                   opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger/80">
        <X className="w-3 h-3 text-white"/>
      </button>
    </div>
  )
}

function TrashCard({ photo, onRestore, onDelete }) {
  return (
    <div className="relative group">
      <div className="aspect-square rounded-xl overflow-hidden bg-elevated opacity-70">
        {photo.thumbnail ? (
          <img src={photo.thumbnail} alt={photo.filename} className="w-full h-full object-cover"/>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-muted/40"/>
          </div>
        )}
      </div>
      {/* Hover actions */}
      <div className="absolute inset-0 rounded-xl bg-black/60 opacity-0 group-hover:opacity-100
                      transition-opacity flex items-center justify-center gap-2">
        <button onClick={onRestore} title="Restore"
          className="w-9 h-9 rounded-full bg-primary/80 flex items-center justify-center hover:bg-primary transition-colors">
          <RotateCcw className="w-4 h-4 text-bg"/>
        </button>
        <button onClick={onDelete} title="Delete forever"
          className="w-9 h-9 rounded-full bg-danger/80 flex items-center justify-center hover:bg-danger transition-colors">
          <Trash2 className="w-4 h-4 text-white"/>
        </button>
      </div>
    </div>
  )
}
