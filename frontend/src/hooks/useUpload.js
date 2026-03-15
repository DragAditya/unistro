import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import useUploadStore from '../store/uploadStore';
import api from '../api';

export function useUpload() {
  const { addFiles, updateProgress, updateStatus, uploads } = useUploadStore();
  const queryClient = useQueryClient();

  const handleUpload = useCallback(async (files, folderId = null) => {
    // 1. Add files to queue store
    addFiles(files, folderId);
    
    // 2. We need fresh State after adding them (Zustand creates new objects with IDs)
    // Wait for state to sync slightly
    setTimeout(() => {
      const state = useUploadStore.getState();
      const currentUploads = state.uploads.filter(u => u.status === 'pending');
      
      // 3. Process uploads
      currentUploads.forEach(async (upload) => {
        try {
          useUploadStore.getState().updateStatus(upload.id, 'uploading');
          
          const formData = new FormData();
          formData.append('file', upload.file);
          if (folderId) formData.append('folder_id', folderId);

          const startTime = Date.now();
          
          await api.post('/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            cancelToken: upload.cancelToken.token,
            onUploadProgress: (progressEvent) => {
              const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              const elapsed = (Date.now() - startTime) / 1000;
              const speed = progressEvent.loaded / elapsed; // bytes per second
              useUploadStore.getState().updateProgress(upload.id, percentage, speed);
            }
          });

          useUploadStore.getState().updateStatus(upload.id, 'success');
          // Refresh file lists
          queryClient.invalidateQueries({ queryKey: ['files'] });
        } catch (err) {
          if (axios.isCancel(err)) {
            console.log('Upload cancelled');
          } else {
            console.error('Upload failed', err);
            useUploadStore.getState().updateStatus(
              upload.id, 
              'error', 
              err.response?.data?.error || err.message || 'Upload failed'
            );
          }
        }
      });
    }, 100);

  }, [addFiles, queryClient]);

  return { handleUpload, uploads };
}

import axios from 'axios';
