import { useState } from 'react';
import { useFilesByType } from '../hooks/useFiles';
import { formatFileSize, formatDate } from '../utils/helpers';
import { FileText, Download, MoreVertical, Star } from 'lucide-react';

export default function Documents() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFilesByType('document', { page, limit: 50 });

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-6">Documents</h2>
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
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
        <div className="w-48 h-48 mb-6 bg-primary/10 rounded-full flex items-center justify-center">
          <span className="text-6xl">📄</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">No documents yet</h2>
        <p className="text-muted-foreground max-w-md">PDFs, Word docs, spreadsheets, and other files will appear here.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-6">Documents</h2>
      
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="col-span-6 flex items-center">Name</div>
          <div className="col-span-2 flex items-center">Date Modified</div>
          <div className="col-span-2 flex items-center">Size</div>
          <div className="col-span-2 flex items-center justify-end">Actions</div>
        </div>
        
        <div className="divide-y divide-border">
          {files.map((file) => (
            <div 
              key={file.id} 
              className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/40 transition-colors cursor-pointer group"
            >
              <div className="col-span-6 flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{file.original_name}</p>
                </div>
              </div>
              <div className="col-span-2 text-sm text-muted-foreground">
                {formatDate(file.created_at)}
              </div>
              <div className="col-span-2 text-sm text-muted-foreground">
                {formatFileSize(file.file_size)}
              </div>
              <div className="col-span-2 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors" title="Star">
                  <Star size={16} />
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
