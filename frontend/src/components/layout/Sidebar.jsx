import { Link, useLocation } from 'react-router-dom';
import { Home, Image as ImageIcon, Video, FileText, Star, Trash2, Folder as FolderIcon, Plus, X } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { cn } from '../../lib/utils';
import { useState } from 'react';

const navItems = [
  { name: 'Home', path: '/dashboard', icon: Home },
  { name: 'Photos', path: '/photos', icon: ImageIcon },
  { name: 'Videos', path: '/videos', icon: Video },
  { name: 'Documents', path: '/documents', icon: FileText },
  { name: 'Starred', path: '/starred', icon: Star },
  { name: 'Trash', path: '/trash', icon: Trash2 },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  // Mock folders for now
  const folders = [
    { id: '1', name: 'Work', color: '#3b82f6' },
    { id: '2', name: 'Personal', color: '#10b981' },
    { id: '3', name: 'Receipts', color: '#f59e0b' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 md:translate-x-0 md:static md:w-64 flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo Area */}
        <div className="flex h-16 items-center flex-shrink-0 px-6 border-b border-border justify-between md:justify-center">
          <Link to="/dashboard" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              U
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
              Unistro
            </span>
          </Link>
          <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon size={18} className={isActive ? "text-primary" : "text-muted-foreground"} />
                {item.name}
              </Link>
            );
          })}

          <div className="pt-6 pb-2">
            <div className="flex items-center justify-between px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Folders</span>
              <button className="hover:text-primary transition-colors">
                <Plus size={14} />
              </button>
            </div>
            <div className="mt-2 space-y-1">
              {folders.map(folder => (
                <Link
                  key={folder.id}
                  to={`/folder/${folder.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: folder.color }} />
                  <span className="truncate">{folder.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* User Profile / Storage Info */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <div className="bg-muted/30 rounded-lg py-3 px-4 mb-4 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <FolderIcon size={14} className="text-primary" />
              <span className="text-xs font-medium">Storage Channel</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5 mb-2 overflow-hidden">
               <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full" style={{ width: '10%' }} />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Unlimited Free Storage</p>
          </div>

          <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden border border-border group-hover:border-primary/50 transition-colors">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold">
                  {user?.firstName?.charAt(0) || user?.phone?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">
                {user?.firstName || 'User'} {user?.lastName || ''}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.phone}
              </p>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
