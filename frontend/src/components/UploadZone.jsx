import { useState, useRef, useCallback, useEffect, memo } from 'react'
import { Upload, X, CheckCircle, AlertCircle, ImagePlus } from 'lucide-react'
import api from '../api'

const MAX_MB = 40

function fmtSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024, s = ['B','KB','MB','GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + s[i]
}

/**
 * FIX: Use useMemo-style preview URLs via useEffect to avoid:
 *   1. Calling URL.createObjectURL() on every render (memory leak)
 *   2. Never revoking the object URLs (they persist until tab closes)
 */
const PreviewThumb = memo(({ file }) => {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)  // cleanup on unmount
  }, [file])

  if (!url) return <div className="w-full h-full bg-bg" />
  return <img src={url} alt="" className="w-full h-full object-cover" />
})

export default function UploadZone({ onUploaded, onClose }) {
  const [dragging, setDragging]   = useState(false)
  const [queue, setQueue]         = useState([])
  const [uploading, setUploading] = useState(false)
  const inputRef                  = useRef()

  const addFiles = useCallback((files) => {
    const valid = [...files].filter(f => f.type.startsWith('image/'))
    const items = valid.map(file => ({
      id:     Math.random().toString(36).slice(2),
      file,
      status: file.size > MAX_MB * 1024 * 1024 ? 'error' : 'pending',
      error:  file.size > MAX_MB * 1024 * 1024 ? `Too large (max ${MAX_MB}MB)` : null,
    }))
    setQueue(q => [...q, ...items])
  }, [])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const startUpload = async () => {
    const pending = queue.filter(i => i.status === 'pending')
    if (!pending.length) return
    setUploading(true)

    for (const item of pending) {
      setQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i))
      try {
        const uploaded = await api.upload(item.file)
        setQueue(q => q.map(i => i.id === item.id ? { ...i, status: 'done' } : i))
        onUploaded(uploaded)
      } catch (e) {
        setQueue(q => q.map(i => i.id === item.id
          ? { ...i, status: 'error', error: e.message || 'Upload failed' } : i))
      }
    }

    setUploading(false)
  }

  const removeItem  = (id) => setQueue(q => q.filter(i => i.id !== id))
  const clearQueue  = ()   => setQueue([])

  const pendingCount = queue.filter(i => i.status === 'pending').length
  const doneCount    = queue.filter(i => i.status === 'done').length

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl animate-slideUp">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-primary"/>
            <h2 className="text-white font-semibold">Upload Photos</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-muted"/>
          </button>
        </div>

        {/* Drop zone */}
        <div className="p-4">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
              ${dragging
                ? 'border-primary bg-primary/10 scale-[1.01]'
                : 'border-border hover:border-primary/40 hover:bg-elevated'
              }
            `}>
            <Upload className={`w-8 h-8 mx-auto mb-3 transition-colors ${dragging ? 'text-primary' : 'text-muted'}`}/>
            <p className="text-white text-sm font-medium">
              {dragging ? 'Drop photos here' : 'Drag & drop or click to select'}
            </p>
            <p className="text-muted text-xs mt-1">Images only · Max {MAX_MB}MB each</p>
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => addFiles(e.target.files)} />
          </div>
        </div>

        {/* Queue */}
        {queue.length > 0 && (
          <div className="px-4 pb-2 max-h-48 overflow-y-auto space-y-2">
            {queue.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-elevated">
                <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-bg">
                  <PreviewThumb file={item.file} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.file.name}</p>
                  <p className="text-xs text-muted">{fmtSize(item.file.size)}</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1.5">
                  {item.status === 'pending'   && <div className="w-2 h-2 rounded-full bg-muted"/>}
                  {item.status === 'uploading' && <Spinner/>}
                  {item.status === 'done'      && <CheckCircle className="w-4 h-4 text-primary"/>}
                  {item.status === 'error'     && (
                    <>
                      <span className="text-xs text-danger max-w-[100px] truncate">{item.error}</span>
                      <AlertCircle className="w-4 h-4 text-danger flex-shrink-0"/>
                    </>
                  )}
                </div>
                {!uploading && item.status !== 'uploading' && (
                  <button onClick={() => removeItem(item.id)}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 flex-shrink-0">
                    <X className="w-3 h-3 text-muted"/>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-4 border-t border-border">
          <p className="text-sm text-muted">
            {doneCount > 0    && <span className="text-primary">{doneCount} uploaded </span>}
            {pendingCount > 0 && <span>{pendingCount} pending</span>}
            {queue.length === 0 && 'No files selected'}
          </p>
          <div className="flex gap-2">
            {queue.length > 0 && !uploading && (
              <button onClick={clearQueue}
                className="px-3 py-2 text-sm text-muted hover:text-white rounded-lg hover:bg-elevated transition-colors">
                Clear
              </button>
            )}
            <button
              onClick={pendingCount === 0 ? onClose : startUpload}
              disabled={uploading}
              className={`
                px-4 py-2 text-sm font-medium rounded-xl transition-all
                ${pendingCount > 0 && !uploading
                  ? 'bg-primary text-bg hover:opacity-90'
                  : 'bg-elevated text-white hover:bg-elevated/80'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}>
              {uploading
                ? 'Uploading...'
                : pendingCount > 0
                  ? `Upload ${pendingCount} photo${pendingCount > 1 ? 's' : ''}`
                  : 'Done'
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}
