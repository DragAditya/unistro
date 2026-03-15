import { useState } from 'react';
import { useFilesByType } from '../hooks/useFiles';

export default function Photos() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFilesByType('image', { page, limit: 30 });

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-6">Photos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {[...Array(24)].map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const files = data?.files || [];

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in duration-500">
        <div className="w-48 h-48 mb-6 bg-primary/10 rounded-full flex items-center justify-center">
          <span className="text-6xl">📸</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">No photos yet</h2>
        <p className="text-muted-foreground max-w-md">Your uploaded images will appear here in a beautiful gallery.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-6">Photos</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
        {files.map((file) => (
          <div 
            key={file.id} 
            className="group relative aspect-square bg-card rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md border border-border/50"
          >
            {/* Standard Thumbnail Request to backend endpoint */}
            <img 
              src={`${import.meta.env.VITE_API_URL || '/api'}/files/${file.id}/thumbnail`} 
              alt={file.original_name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            {/* Hover Overlay */}
            <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
               <p className="text-white text-xs truncate drop-shadow-md">{file.original_name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
