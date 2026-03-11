import { Images, Heart, BookImage, Trash2, LayoutGrid } from 'lucide-react'

const Logo = () => (
  <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
    <defs>
      <linearGradient id="slg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00c9b8"/>
        <stop offset="1" stopColor="#a78bfa"/>
      </linearGradient>
    </defs>
    <rect width="36" height="36" rx="10" fill="url(#slg)"/>
    <path d="M10 22l6-8 5 6 3-4 5 6H10z" fill="#070b14" opacity="0.9"/>
    <circle cx="25" cy="13" r="2.5" fill="#070b14" opacity="0.9"/>
  </svg>
)

const navItems = [
  { id: 'photos',    label: 'Photos',    icon: Images },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'albums',    label: 'Albums',    icon: BookImage },
  { id: 'trash',     label: 'Trash',     icon: Trash2 },
]

function fmtSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function Sidebar({ view, onView, stats, onLogout, collapsed }) {
  return (
    <aside className={`
      flex flex-col bg-surface border-r border-border transition-all duration-300
      ${collapsed ? 'w-16' : 'w-56'}
    `}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <Logo />
        {!collapsed && (
          <div>
            <span className="text-white font-bold text-lg tracking-tight">UniStro</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = view === id || (view.startsWith('album:') && id === 'albums')
          return (
            <button key={id} onClick={() => onView(id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-150 group
                ${active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted hover:bg-elevated hover:text-white'
                }
              `}>
              <Icon className={`w-5 h-5 flex-shrink-0 transition-colors
                ${active ? 'text-primary' : 'text-muted group-hover:text-white'}`} />
              {!collapsed && <span>{label}</span>}
              {!collapsed && id === 'trash' && stats?.trash > 0 && (
                <span className="ml-auto text-xs bg-danger/20 text-danger rounded-full px-1.5 py-0.5">
                  {stats.trash}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Stats */}
      {!collapsed && stats && (
        <div className="p-3 m-3 rounded-xl bg-elevated border border-border text-xs space-y-1.5">
          <div className="flex justify-between text-muted">
            <span>Photos</span>
            <span className="text-white font-medium">{stats.total_photos.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Stored</span>
            <span className="text-white font-medium">{fmtSize(stats.total_size)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Favorites</span>
            <span className="text-primary font-medium">{stats.favorites}</span>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                     text-muted hover:text-danger hover:bg-danger/10 transition-all">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
