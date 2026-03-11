import { useState, useCallback } from 'react'
import { Heart, Trash2, CheckCircle2 } from 'lucide-react'

function groupByMonth(photos) {
  const groups = {}
  photos.forEach(p => {
    const raw  = p.taken_at || p.uploaded_at
    const date = raw ? new Date(raw.replace(':', '-').replace(':', '-')) : new Date()
    const key  = isNaN(date) ? 'Unknown date' :
      date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  })
  return Object.entries(groups)
}

export default function PhotoGrid({
  photos, onPhotoClick, onToggleFav, onTrash,
  selectable, selectedIds, onSelect, emptyMsg
}) {
  if (!photos || photos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted py-20">
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <p className="text-sm">{emptyMsg || 'No photos yet'}</p>
      </div>
    )
  }

  const groups = groupByMonth(photos)

  return (
    <div className="space-y-6 pb-8">
      {groups.map(([month, groupPhotos]) => (
        <section key={month}>
          <h3 className="text-sm font-semibold text-muted px-1 mb-3 sticky top-0 bg-bg/80 backdrop-blur-sm py-1 z-10">
            {month}
          </h3>
          <div className="grid gap-1"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            {groupPhotos.map(photo => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onClick={() => onPhotoClick(photo)}
                onFav={e => { e.stopPropagation(); onToggleFav(photo) }}
                onTrash={e => { e.stopPropagation(); onTrash(photo) }}
                selectable={selectable}
                selected={selectedIds?.has(photo.id)}
                onSelect={() => onSelect?.(photo.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function PhotoCard({ photo, onClick, onFav, onTrash, selectable, selected, onSelect }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={`
        relative aspect-square overflow-hidden rounded-lg cursor-pointer
        transition-all duration-200 group
        ${selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-bg' : ''}
      `}
      onClick={selectable ? onSelect : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      {photo.thumbnail ? (
        <img
          src={photo.thumbnail}
          alt={photo.filename}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-elevated flex items-center justify-center">
          <svg className="w-8 h-8 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01"/>
          </svg>
        </div>
      )}

      {/* Hover overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20
                       transition-opacity duration-200 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`}>
        {/* Top-left: select */}
        {selectable && (
          <div className="absolute top-1.5 left-1.5">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
              ${selected ? 'bg-primary border-primary' : 'border-white/70 bg-black/30'}`}>
              {selected && (
                <svg className="w-3 h-3 text-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Top-right: favorite indicator */}
        {photo.is_favorite && (
          <div className="absolute top-1.5 right-1.5">
            <Heart className="w-4 h-4 text-red-400 fill-red-400 drop-shadow" />
          </div>
        )}

        {/* Bottom actions */}
        {!selectable && hovered && (
          <div className="absolute bottom-1.5 right-1.5 flex gap-1">
            <ActionBtn onClick={onFav} title={photo.is_favorite ? 'Unfavorite' : 'Favorite'}>
              <Heart className={`w-3.5 h-3.5 ${photo.is_favorite ? 'fill-red-400 text-red-400' : 'text-white'}`}/>
            </ActionBtn>
            <ActionBtn onClick={onTrash} title="Move to trash">
              <Trash2 className="w-3.5 h-3.5 text-white"/>
            </ActionBtn>
          </div>
        )}
      </div>
    </div>
  )
}

function ActionBtn({ onClick, title, children }) {
  return (
    <button onClick={onClick} title={title}
      className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center
                 hover:bg-black/80 transition-colors">
      {children}
    </button>
  )
}
