import { useState, useEffect } from 'react';
import { groupFilesByDate } from '../utils/helpers';
// Temporary mock data for UI testing before backend integration
const mockFiles = [
  { id: '1', original_name: 'Summer Vacation 2023.jpg', file_size: 2500000, mime_type: 'image/jpeg', file_type: 'image', created_at: new Date().toISOString() },
  { id: '2', original_name: 'Project Proposal Final.pdf', file_size: 1560000, mime_type: 'application/pdf', file_type: 'document', created_at: new Date().toISOString() },
  { id: '3', original_name: 'Dashboard UI Concept.fig', file_size: 45000000, mime_type: 'application/octet-stream', file_type: 'other', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: '4', original_name: 'Review Video.mp4', file_size: 105000000, mime_type: 'video/mp4', file_type: 'video', created_at: new Date(Date.now() - 172800000).toISOString() },
];

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [groupedFiles, setGroupedFiles] = useState({});

  useEffect(() => {
    // Simulate API fetch delay
    setTimeout(() => {
      setFiles(mockFiles);
      setGroupedFiles(groupFilesByDate(mockFiles));
      setLoading(false);
    }, 800);
  }, []);

  if (loading) {
    return (
      <div className="p-6 md:p-8 w-full h-full">
        {/* Skeleton loader for header */}
        <div className="w-1/4 h-8 bg-muted rounded animate-pulse mb-8" />
        {/* Skeleton loader for grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in duration-500">
        <div className="w-48 h-48 mb-6 bg-primary/10 rounded-full flex items-center justify-center">
          <span className="text-6xl border-primary">☁️</span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to Unistro</h2>
        <p className="text-muted-foreground max-w-md">Your personal cloud is empty. Drag and drop any files here or click the Upload button to get started.</p>
        <button className="mt-8 bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
          Upload Files
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-500">
      {Object.entries(groupedFiles).map(([dateLabel, dateFiles]) => (
        <div key={dateLabel} className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4 sticky top-0 bg-background/90 backdrop-blur-sm z-10 py-2 border-b border-border/50">
            {dateLabel}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
            {dateFiles.map((file) => (
              <div 
                key={file.id} 
                className="group relative aspect-square bg-card rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                {/* Simulated file display based on type */}
                {file.file_type === 'image' ? (
                  <div className="w-full h-full bg-gradient-to-tr from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center p-4">
                    <span className="text-4xl">📸</span>
                  </div>
                ) : file.file_type === 'video' ? (
                  <div className="w-full h-full bg-gradient-to-tr from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 flex items-center justify-center p-4">
                    <span className="text-4xl">🎬</span>
                  </div>
                ) : file.file_type === 'document' ? (
                  <div className="w-full h-full bg-gradient-to-tr from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 flex items-center justify-center p-4">
                    <span className="text-4xl">📄</span>
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-gray-100 to-slate-100 dark:from-gray-800/40 dark:to-slate-800/40 flex items-center justify-center p-4">
                    <span className="text-4xl">📁</span>
                  </div>
                )}
                
                {/* Hover Overlay */}
                <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                  <p className="text-white text-xs font-medium truncate" title={file.original_name}>
                    {file.original_name}
                  </p>
                  <p className="text-white/70 text-[10px]">
                    {(file.file_size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
