import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import GlobalDropzone from '../files/GlobalDropzone';
import UploadTray from '../files/UploadTray';

export default function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30 selection:text-foreground">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 w-0 overflow-hidden relative">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none scroll-smooth">
          <GlobalDropzone>
            <div className="absolute inset-0 pb-20 md:pb-0 h-full">
              {children}
            </div>
          </GlobalDropzone>
        </main>

        <UploadTray />
      </div>
    </div>
  );
}
