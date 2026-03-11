const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const tok  = () => localStorage.getItem('unistro_token') || ''
const json = () => ({ Authorization: tok(), 'Content-Type': 'application/json' })
const bare = () => ({ Authorization: tok() })

async function handle(res) {
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Request failed')
  return data
}

const api = {
  // ── Auth ──
  sendCode:   (phone) =>
    fetch(`${BASE}/auth/send-code`, { method:'POST', headers:json(), body:JSON.stringify({phone}) }).then(handle),

  verify:     (phone, code, phone_code_hash) =>
    fetch(`${BASE}/auth/verify`, { method:'POST', headers:json(), body:JSON.stringify({phone,code,phone_code_hash}) }).then(handle),

  verify2fa:  (phone, password) =>
    fetch(`${BASE}/auth/verify-2fa`, { method:'POST', headers:json(), body:JSON.stringify({phone,password}) }).then(handle),

  logout:     () =>
    fetch(`${BASE}/auth/logout`, { method:'POST', headers:bare() }).then(handle),

  // ── Photos ──
  getPhotos:  (params={}) =>
    fetch(`${BASE}/photos?${new URLSearchParams(params)}`, { headers:bare() }).then(handle),

  upload:     (file) => {
    const form = new FormData()
    form.append('file', file)
    return fetch(`${BASE}/photos/upload`, { method:'POST', headers:bare(), body:form }).then(handle)
  },

  // Returns a blob URL for the full photo (auth'd)
  getFullUrl: async (id) => {
    const res = await fetch(`${BASE}/photos/${id}/full`, { headers:bare() })
    if (!res.ok) throw new Error('Failed to load photo')
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  },

  toggleFav:  (id) =>
    fetch(`${BASE}/photos/${id}/favorite`, { method:'PATCH', headers:bare() }).then(handle),

  trashPhoto: (id) =>
    fetch(`${BASE}/photos/${id}`, { method:'DELETE', headers:bare() }).then(handle),

  // ── Trash ──
  getTrash:       () =>
    fetch(`${BASE}/trash`, { headers:bare() }).then(handle),

  restorePhoto:   (id) =>
    fetch(`${BASE}/trash/${id}/restore`, { method:'POST', headers:bare() }).then(handle),

  deleteForever:  (id) =>
    fetch(`${BASE}/trash/${id}/permanent`, { method:'DELETE', headers:bare() }).then(handle),

  // ── Albums ──
  getAlbums:   () =>
    fetch(`${BASE}/albums`, { headers:bare() }).then(handle),

  createAlbum: (name) =>
    fetch(`${BASE}/albums`, { method:'POST', headers:json(), body:JSON.stringify({name}) }).then(handle),

  deleteAlbum: (id) =>
    fetch(`${BASE}/albums/${id}`, { method:'DELETE', headers:bare() }).then(handle),

  getAlbum:    (id) =>
    fetch(`${BASE}/albums/${id}`, { headers:bare() }).then(handle),

  addToAlbum:  (albumId, photoId) =>
    fetch(`${BASE}/albums/${albumId}/photos?photo_id=${photoId}`, { method:'POST', headers:bare() }).then(handle),

  removeFromAlbum: (albumId, photoId) =>
    fetch(`${BASE}/albums/${albumId}/photos/${photoId}`, { method:'DELETE', headers:bare() }).then(handle),

  // ── Stats ──
  getStats: () =>
    fetch(`${BASE}/stats`, { headers:bare() }).then(handle),
}

export default api
