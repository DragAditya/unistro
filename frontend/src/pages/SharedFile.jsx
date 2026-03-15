import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, AlertCircle, File, Image as ImageIcon, Video, FileText } from 'lucide-react';
import axios from 'axios';

export default function SharedFile() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchLinkInfo = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || '/api'}/share/${token}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Link expired or not found');
      } finally {
        setLoading(false);
      }
    };
    fetchLinkInfo();
  }, [token]);

  const handleDownload = () => {
    setDownloading(true);
    // Trigger browser download via straight URL navigation
    window.location.href = `${import.meta.env.VITE_API_URL || '/api'}/share/${token}/download`;
    
    // Reset state after a delay assuming download started
    setTimeout(() => {
      setDownloading(false);
      // Optimistically update limit if exists
      if (data?.downloadsRemaining) {
        setData(prev => ({ ...prev, downloadsRemaining: prev.downloadsRemaining - 1 }));
      }
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-20 w-20 bg-muted rounded-2xl mb-6"></div>
          <div className="h-6 w-48 bg-muted rounded mb-3"></div>
          <div className="h-4 w-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 selection:bg-primary/30">
        <div className="w-full max-w-md bg-card border border-border p-8 rounded-3xl shadow-lg text-center animate-in zoom-in-95">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Link Invalid</h2>
          <p className="text-muted-foreground mb-8">{error}</p>
          <a href="/" className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-full text-sm font-medium hover:bg-secondary/80 transition-colors">
            Go to Unistro
          </a>
        </div>
      </div>
    );
  }

  const { file, expiresAt, downloadsRemaining } = data;

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getIcon = () => {
    switch(file.type) {
      case 'image': return <ImageIcon size={40} className="text-blue-500" />;
      case 'video': return <Video size={40} className="text-red-500" />;
      case 'document': return <FileText size={40} className="text-indigo-500" />;
      default: return <File size={40} className="text-gray-500" />;
    }
  };

  const isLimitReached = downloadsRemaining !== null && downloadsRemaining <= 0;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 selection:bg-primary/30 relative">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 blur-[100px] rounded-full opacity-50 pointer-events-none" />
      
      <div className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-border p-8 rounded-3xl shadow-xl relative z-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
        
        {/* Brand */}
        <div className="flex justify-center items-center gap-2 mb-8">
           <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">U</div>
           <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">Unistro</span>
        </div>

        {/* File Info */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-muted/50 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-inner border border-border/50">
            {getIcon()}
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2 break-all line-clamp-2" title={file.name}>{file.name}</h1>
          <p className="text-sm font-medium text-muted-foreground bg-muted/50 inline-block px-3 py-1 rounded-full">
            {formatSize(file.size)} • {file.type.toUpperCase()}
          </p>
        </div>

        {/* Meta info */}
        <div className="space-y-3 mb-8 text-sm">
          {expiresAt && (
            <div className="flex justify-between items-center px-4 py-3 bg-muted/30 rounded-xl border border-border/40">
              <span className="text-muted-foreground">Expires</span>
              <span className="font-medium text-foreground">{new Date(expiresAt).toLocaleDateString()}</span>
            </div>
          )}
          {downloadsRemaining !== null && (
            <div className="flex justify-between items-center px-4 py-3 bg-muted/30 rounded-xl border border-border/40">
              <span className="text-muted-foreground">Downloads left</span>
              <span className="font-medium text-foreground">{downloadsRemaining}</span>
            </div>
          )}
        </div>

        {/* Action */}
        <button
          onClick={handleDownload}
          disabled={isLimitReached || downloading}
          className="w-full flex justify-center items-center gap-2 py-4 px-4 rounded-2xl shadow-lg text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:-translate-y-1 hover:shadow-xl active:translate-y-0"
        >
          {downloading ? (
            <span className="animate-pulse">Starting download...</span>
          ) : isLimitReached ? (
            'Download limit reached'
          ) : (
            <>
              Download File <Download size={20} />
            </>
          )}
        </button>

      </div>
      
      <p className="mt-8 text-sm text-muted-foreground relative z-10">
        Shared securely via Unistro
      </p>
    </div>
  );
}
