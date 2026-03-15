import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../api';
import { LogOut, User, HardDrive, FolderOpen, Calendar, Shield } from 'lucide-react';

export default function Profile() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      logout();
      navigate('/login');
    }
  };

  if (!user) return null;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold mb-8">Account Profile</h2>
      
      {/* Profile Header */}
      <div className="bg-card border border-border rounded-3xl p-8 mb-8 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="w-32 h-32 rounded-full border-4 border-background bg-muted overflow-hidden shrink-0 shadow-lg relative z-10">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-4xl">
              {user.firstName?.charAt(0) || user.phone?.charAt(0)}
            </div>
          )}
        </div>
        
        <div className="flex-1 text-center md:text-left relative z-10">
          <h3 className="text-3xl font-bold text-foreground mb-1">
            {user.firstName} {user.lastName}
          </h3>
          <p className="text-lg text-primary font-medium mb-4">{user.phone}</p>
          
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
             <div className="px-4 py-2 bg-muted/50 rounded-full border border-border/50 text-sm flex items-center gap-2">
               <Shield size={16} className="text-emerald-500" /> Telegram Authenticated
             </div>
             {user.username && (
               <div className="px-4 py-2 bg-muted/50 rounded-full border border-border/50 text-sm flex items-center gap-2">
                 <User size={16} className="text-indigo-500" /> @{user.username}
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary/30 transition-colors group">
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <HardDrive size={24} className="text-blue-500" />
          </div>
          <p className="text-muted-foreground text-sm font-medium mb-1">Total Files</p>
          <p className="text-3xl font-bold">{user.totalFiles || 0}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary/30 transition-colors group">
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FolderOpen size={24} className="text-amber-500" />
          </div>
          <p className="text-muted-foreground text-sm font-medium mb-1">Folders</p>
          <p className="text-3xl font-bold">{user.totalFolders || 0}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary/30 transition-colors group">
          <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Calendar size={24} className="text-violet-500" />
          </div>
          <p className="text-muted-foreground text-sm font-medium mb-1">Joined</p>
          <p className="text-xl font-bold mt-2">
            {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Danger Zone */}
      <h3 className="text-lg font-semibold mb-4 text-muted-foreground">Account Actions</h3>
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
         <div>
           <p className="font-medium text-foreground mb-1">Sign out of Unistro</p>
           <p className="text-sm text-muted-foreground">Your session will be securely terminated. You'll need to use Telegram OTP to log in again.</p>
         </div>
         <button 
           onClick={handleLogout}
           disabled={loggingOut}
           className="shrink-0 flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl font-medium transition-colors"
         >
           <LogOut size={18} />
           {loggingOut ? 'Signing out...' : 'Sign Out'}
         </button>
      </div>
    </div>
  );
}
