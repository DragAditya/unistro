import { useState } from 'react';
import { useFilesByType } from '../hooks/useFiles';
import { PlayCircle } from 'lucide-react';

export default function Videos() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFilesByType('video', { page, limit: 30 });

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-6">Videos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-video bg-muted rounded-xl animate-pulse" />
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
          <span className="text-6xl">🎬</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">No videos yet</h2>
        <p className="text-muted-foreground max-w-md">Your uploaded video files will appear here, ready to stream beautifully.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-6">Videos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {files.map((file) => (
          <div 
            key={file.id} 
            className="group relative aspect-video bg-card rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all border border-border/50"
          >
            {/* Fallback pattern since we don't have real thumbnails for videos yet */}
            <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white/50 pattern-dots pattern-slate-800 pattern-size-4">
              <PlayCircle size={48} className="group-hover:scale-110 group-hover:text-white transition-all duration-300" />
            </div>

            {/* Hover Overlay */}
            <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4">
               <p className="text-white text-sm font-medium truncate drop-shadow-md">{file.original_name}</p>
               <div className="flex justify-between items-center mt-1">
                 <p className="text-white/70 text-xs">{(file.file_size / 1024 / 1024).toFixed(1)} MB</p>
                 <span className="text-white/80 text-xs bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-sm">
                   {file.duration ? `${Math.floor(file.duration/60)}:${(file.duration%60).toString().padStart(2,'0')}` : 'Video'}
                 </span>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
