import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useFiles } from '../hooks/useFiles';
import { formatFileSize, formatDate } from '../utils/helpers';
import { Folder as FolderIcon, FileText, Download, MoreVertical, Image, Video, File, ChevronRight } from 'lucide-react';

export default function Folder() {
  const { id } = useParams();
  const [folderInfo, setFolderInfo] = useState({ folder: null, breadcrumbs: [], subfolders: [] });
  const [loadingFolder, setLoadingFolder] = useState(true);

  const { data: filesData, isLoading: loadingFiles } = useFiles({ folder_id: id, limit: 100 });

  useEffect(() => {
    const fetchFolderData = async () => {
      try {
        setLoadingFolder(true);
        const { data } = await api.get(`/folders/${id}`);
        setFolderInfo(data);
      } catch (err) {
        console.error('Failed to fetch folder', err);
      } finally {
        setLoadingFolder(false);
      }
    };
    if (id) fetchFolderData();
  }, [id]);

  if (loadingFolder || loadingFiles) {
    return (
      <div className="p-6 md:p-8">
        <div className="w-1/3 h-8 bg-muted rounded animate-pulse mb-8" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const { folder, breadcrumbs, subfolders } = folderInfo;
  const files = filesData?.files || [];

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
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6 text-sm font-medium overflow-x-auto pb-2 scrollbar-none">
        <Link to="/dashboard" className="text-muted-foreground hover:text-foreground whitespace-nowrap">Home</Link>
        {breadcrumbs.map((crumb, idx) => (
          <div key={crumb.id} className="flex items-center gap-2 whitespace-nowrap">
            <ChevronRight size={16} className="text-muted-foreground" />
            {idx === breadcrumbs.length - 1 ? (
              <span className="text-foreground">{crumb.name}</span>
            ) : (
              <Link to={`/folder/${crumb.id}`} className="text-muted-foreground hover:text-foreground">{crumb.name}</Link>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-opacity-10" style={{ backgroundColor: `${folder?.color}20`, color: folder?.color }}>
          <FolderIcon size={24} fill="currentColor" />
        </div>
        <h2 className="text-3xl font-bold">{folder?.name}</h2>
      </div>

      {subfolders.length === 0 && files.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-2xl bg-muted/10">
          <FolderIcon size={48} className="text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-medium mb-2">This folder is empty</h3>
          <p className="text-muted-foreground mb-6">Drop files here or click to upload</p>
          <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium shadow-sm hover:shadow transition-all">
            Upload Files
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-border">
            {/* Subfolders */}
            {subfolders.map(sub => (
              <Link 
                key={sub.id} 
                to={`/folder/${sub.id}`}
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/40 transition-colors cursor-pointer group block"
              >
                <div className="col-span-10 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-opacity-10" style={{ backgroundColor: `${sub.color}20`, color: sub.color }}>
                    <FolderIcon size={20} fill="currentColor" />
                  </div>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{sub.name}</p>
                </div>
                <div className="col-span-2 flex justify-end">
                   <MoreVertical size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100" />
                </div>
              </Link>
            ))}

            {/* Files */}
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
                <div className="col-span-3 sm:col-span-2 text-sm text-muted-foreground text-right sm:text-left">
                  {formatFileSize(file.file_size)}
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
      )}
    </div>
  );
}
