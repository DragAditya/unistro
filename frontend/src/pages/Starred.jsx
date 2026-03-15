import { useState } from 'react';
import { useStarredFiles } from '../hooks/useFiles';
import { formatFileSize, formatDate } from '../utils/helpers';
import { Star, Download, MoreVertical, Image, Video, FileText, File } from 'lucide-react';

export default function Starred() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useStarredFiles({ page, limit: 50 });

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-6">Starred</h2>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const files = data?.files || [];

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in duration-500">
        <div className="w-48 h-48 mb-6 bg-amber-500/10 rounded-full flex items-center justify-center">
          <Star size={80} className="text-amber-500" fill="currentColor" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">No starred files</h2>
        <p className="text-muted-foreground max-w-md">Star your most important files to keep them easily accessible here.</p>
      </div>
    );
  }

  const getIcon = (type) => {
    switch(type) {
      case 'image': return <Image size={20} className="text-blue-500" />;
      case 'video': return <Video size={20} className="text-red-500" />;
      case 'document': return <FileText size={20} className="text-indigo-500" />;
      default: return <File size={20} className="text-gray-500" />;
    }
  };

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold">Starred</h2>
        <Star size={24} className="text-amber-500" fill="currentColor" />
      </div>
      
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-border">
          {files.map((file) => (
            <div 
              key={file.id} 
              className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/40 transition-colors cursor-pointer group"
            >
              <div className="col-span-7 sm:col-span-6 flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {getIcon(file.file_type)}
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{file.original_name}</p>
                </div>
              </div>
              <div className="hidden sm:block sm:col-span-2 text-sm text-muted-foreground">
                {formatDate(file.created_at)}
              </div>
              <div className="col-span-3 sm:col-span-2 text-sm text-muted-foreground text-right sm:text-left">
                {formatFileSize(file.file_size)}
              </div>
              <div className="col-span-2 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-full transition-colors" title="Unstar">
                  <Star size={16} fill="currentColor" />
                </button>
                <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors" title="Download">
                  <Download size={16} />
                </button>
                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
