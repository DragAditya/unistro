import { useState } from 'react';
import { useTrashFiles } from '../hooks/useFiles';
import { formatFileSize, formatDate } from '../utils/helpers';
import { Trash2, RefreshCcw, File, Image, Video, FileText } from 'lucide-react';

export default function Trash() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTrashFiles({ page, limit: 50 });

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-6">Trash</h2>
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
        <div className="w-48 h-48 mb-6 bg-destructive/10 rounded-full flex items-center justify-center">
          <Trash2 size={80} className="text-destructive/50" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Trash is empty</h2>
        <p className="text-muted-foreground max-w-md">Deleted files are kept here for 30 days before being permanently removed from your Telegram channel.</p>
      </div>
    );
  }

  const getIcon = (type) => {
    switch(type) {
      case 'image': return <Image size={20} />;
      case 'video': return <Video size={20} />;
      case 'document': return <FileText size={20} />;
      default: return <File size={20} />;
    }
  };

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            Trash <Trash2 size={24} className="text-muted-foreground" />
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Files are permanently deleted after 30 days.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg font-medium transition-colors">
          Empty Trash
        </button>
      </div>
      
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-border">
          {files.map((file) => (
            <div 
              key={file.id} 
              className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/40 transition-colors cursor-pointer group"
            >
              <div className="col-span-7 sm:col-span-6 flex items-center gap-4 min-w-0 opacity-60">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {getIcon(file.file_type)}
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium text-foreground truncate line-through">{file.original_name}</p>
                </div>
              </div>
              <div className="hidden sm:block sm:col-span-2 text-sm text-muted-foreground">
                Deleted {formatDate(file.deleted_at || file.updated_at)}
              </div>
              <div className="col-span-3 sm:col-span-2 text-sm text-muted-foreground text-right sm:text-left">
                {formatFileSize(file.file_size)}
              </div>
              <div className="col-span-2 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors" title="Restore">
                  <RefreshCcw size={16} />
                </button>
                <button className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors" title="Delete Permanently">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
