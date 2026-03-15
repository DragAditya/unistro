import { create } from 'zustand';
import axios from 'axios';

const useUploadStore = create((set, get) => ({
  uploads: [], // Array of upload objects
  isTrayOpen: false,
  isTrayMinimized: false,

  toggleTray: (open) => set((state) => ({ isTrayOpen: open !== undefined ? open : !state.isTrayOpen })),
  toggleMinimize: () => set((state) => ({ isTrayMinimized: !state.isTrayMinimized })),
  
  // Add files to queue
  addFiles: (files, folderId = null) => {
    const newUploads = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
      folderId,
      progress: 0,
      speed: 0,
      status: 'pending', // pending, uploading, success, error
      errorMsg: null,
      cancelToken: axios.CancelToken.source()
    }));

    set((state) => ({
      uploads: [...state.uploads, ...newUploads],
      isTrayOpen: true,
      isTrayMinimized: false,
    }));
  },

  updateProgress: (id, progress, speed) => set((state) => ({
    uploads: state.uploads.map(u => u.id === id ? { ...u, progress, speed } : u)
  })),

  updateStatus: (id, status, errorMsg = null) => set((state) => ({
    uploads: state.uploads.map(u => u.id === id ? { ...u, status, errorMsg } : u)
  })),

  cancelUpload: (id) => {
    const state = get();
    const upload = state.uploads.find(u => u.id === id);
    if (upload && upload.status === 'uploading') {
      upload.cancelToken.cancel('Upload cancelled by user');
      set((s) => ({
        uploads: s.uploads.map(u => u.id === id ? { ...u, status: 'error', errorMsg: 'Cancelled' } : u)
      }));
    }
  },

  clearCompleted: () => set((state) => ({
    uploads: state.uploads.filter(u => u.status !== 'success' && u.status !== 'error')
  })),
  
  clearAll: () => set({ uploads: [], isTrayOpen: false })
}));

export default useUploadStore;
