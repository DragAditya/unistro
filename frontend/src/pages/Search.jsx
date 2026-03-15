import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { SearchIcon, FileText, Image, Video, File } from 'lucide-react';
import { formatFileSize, formatDate } from '../utils/helpers';

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState({ files: [], folders: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        if (query.trim()) {
          const { data } = await api.get(`/search?q=${encodeURIComponent(query)}`);
          setResults(data);
        } else {
          setResults({ files: [], folders: [] });
        }
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchResults, 300); // 300ms debounce
    return () => clearTimeout(timeoutId);
  }, [query]);

  if (!query) {
    return (
      <div className="p-8 text-center text-muted-foreground mt-20">
        Type in the search bar to find your files...
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground mt-20 animate-pulse">Searching...</div>;
  }

  const { files, folders } = results;

  if (files.length === 0 && folders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in duration-500">
        <div className="w-48 h-48 mb-6 bg-muted rounded-full flex items-center justify-center">
          <SearchIcon size={80} className="text-muted-foreground/30" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">No results found</h2>
        <p className="text-muted-foreground max-w-md">We couldn't find anything matching "{query}". Check spelling or try different keywords.</p>
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
      <h2 className="text-2xl font-bold mb-6">
        Search results for <span className="text-primary">"{query}"</span>
      </h2>
      
      {folders.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Folders</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
             {folders.map(f => (
               <div key={f.id} className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-primary/50 cursor-pointer transition-colors shadow-sm text-center">
                 <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">📁</div>
                 <span className="text-sm font-medium truncate w-full">{f.name}</span>
               </div>
             ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Files</h3>
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
                  <div className="hidden sm:block sm:col-span-3 text-sm text-muted-foreground">
                    {formatDate(file.created_at)}
                  </div>
                  <div className="col-span-5 sm:col-span-3 text-sm text-muted-foreground text-right">
                    {formatFileSize(file.file_size)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
