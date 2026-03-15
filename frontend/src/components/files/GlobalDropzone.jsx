import { useCallback, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import useUploadStore from '../../store/uploadStore';
import { useUpload } from '../../hooks/useUpload';
import { cn } from '../../lib/utils';

export default function GlobalDropzone({ children }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const { handleUpload } = useUpload();

  const onDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    if (dragCounter - 1 === 0) {
      setIsDragging(false);
    }
  }, [dragCounter]);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Pass the dropped files to our upload handler
      handleUpload(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, [handleUpload]);

  return (
    <div 
      className="relative w-full h-full"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* The main app content */}
      <div className={cn("w-full h-full transition-opacity", isDragging && "opacity-50 blur-sm")}>
        {children}
      </div>

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md m-4 md:m-8 border-4 border-dashed border-primary rounded-3xl pointer-events-none animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card shadow-2xl rounded-2xl border border-border">
            <div className="w-24 h-24 mb-6 bg-primary/10 rounded-full flex items-center justify-center">
              <UploadCloud size={48} className="text-primary animate-bounce" />
            </div>
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 mb-2">
              Drop files anywhere
            </h2>
            <p className="text-lg text-muted-foreground font-medium">
              We'll instantly securely upload them to your Telegram channel
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
