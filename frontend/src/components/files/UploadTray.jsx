import { useRef, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Check, AlertCircle, XCircle } from 'lucide-react';
import useUploadStore from '../../store/uploadStore';
import { cn, formatFileSize } from '../../lib/utils';

export default function UploadTray() {
  const { 
    uploads, 
    isTrayOpen, 
    isTrayMinimized, 
    toggleTray, 
    toggleMinimize, 
    cancelUpload, 
    clearCompleted 
  } = useUploadStore();

  const bottomRef = useRef(null);

  // Auto scroll to bottom when new uploads are added
  useEffect(() => {
    if (!isTrayMinimized && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [uploads.length, isTrayMinimized]);

  if (!isTrayOpen) return null;

  const activeUploads = uploads.filter(u => u.status === 'uploading' || u.status === 'pending').length;
  const isDone = activeUploads === 0 && uploads.length > 0;

  return (
    <div className={cn(
      "fixed right-4 z-50 w-full max-w-sm bg-card border border-border shadow-2xl rounded-t-xl overflow-hidden flex flex-col transition-all duration-300 ease-in-out",
      isTrayMinimized ? "bottom-0 h-14" : "bottom-0 h-[400px]"
    )}>
      {/* Header */}
      <div 
        className="h-14 bg-muted/50 px-4 flex items-center justify-between cursor-pointer border-b border-border select-none"
        onClick={() => toggleMinimize()}
      >
        <div className="flex flex-col">
          <span className="font-semibold text-sm">
            {isDone ? 'Uploads complete' : `Uploading ${activeUploads} ${activeUploads === 1 ? 'item' : 'items'}`}
          </span>
          {!isDone && !isTrayMinimized && (
             <span className="text-xs text-muted-foreground">Powering through...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors">
            {isTrayMinimized ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          <button 
            className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              toggleTray(false);
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* List */}
      {!isTrayMinimized && (
        <div className="flex-1 overflow-y-auto p-2 scroll-smooth">
          {uploads.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No active uploads
            </div>
          ) : (
            <div className="space-y-1">
              {uploads.map((upload) => (
                <div key={upload.id} className="p-3 bg-background border border-border rounded-lg group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate pr-4 text-foreground" title={upload.name}>
                      {upload.name}
                    </span>
                    
                    {upload.status === 'uploading' && (
                      <button 
                         onClick={() => cancelUpload(upload.id)}
                         className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                         title="Cancel upload"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                    {upload.status === 'success' && <Check size={16} className="text-emerald-500 shrink-0" />}
                    {upload.status === 'error' && <AlertCircle size={16} className="text-destructive shrink-0" />}
                    {upload.status === 'pending' && <span className="text-[10px] uppercase font-bold text-muted-foreground">Wait</span>}
                  </div>
                  
                  {upload.status === 'uploading' && (
                    <>
                      <div className="w-full bg-secondary rounded-full h-1.5 mb-1 overflow-hidden">
                        <div 
                          className="bg-primary h-1.5 rounded-full transition-all duration-300 ease-out" 
                          style={{ width: `${upload.progress}%` }} 
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{formatFileSize(upload.size)}</span>
                        <span>{formatFileSize(upload.speed)}/s • {upload.progress}%</span>
                      </div>
                    </>
                  )}
                  {upload.status === 'error' && (
                    <p className="text-xs text-destructive mt-1">{upload.errorMsg}</p>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {!isTrayMinimized && isDone && uploads.length > 0 && (
        <div className="p-2 bg-muted/30 border-t border-border mt-auto">
          <button 
            onClick={clearCompleted}
            className="w-full py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear completed
          </button>
        </div>
      )}
    </div>
  );
}
