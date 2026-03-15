import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

const FOLDERS_KEY = 'folders';

export function useFolders(parentId = null) {
  return useQuery({
    queryKey: [FOLDERS_KEY, 'list', parentId],
    queryFn: async () => {
      const params = parentId ? { parent_id: parentId } : {};
      const { data } = await api.get('/folders', { params });
      return data.folders;
    },
  });
}

export function useFolder(id) {
  return useQuery({
    queryKey: [FOLDERS_KEY, 'detail', id],
    queryFn: async () => {
      if (!id || id === 'root') return null;
      const { data } = await api.get(`/folders/${id}`);
      return data;
    },
    enabled: !!id && id !== 'root',
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (folderData) => {
      const { data } = await api.post('/folders', folderData);
      return data.folder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FOLDERS_KEY] });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data } = await api.patch(`/folders/${id}`, updates);
      return data.folder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FOLDERS_KEY] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/folders/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FOLDERS_KEY] });
      // Invalidate files too since files in deleted folder move to root
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}
