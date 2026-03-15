import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

const FILES_KEY = 'files';

export function useFiles(params = {}) {
  return useQuery({
    queryKey: [FILES_KEY, params],
    queryFn: async () => {
      const { data } = await api.get('/files', { params });
      return data;
    },
    keepPreviousData: true,
  });
}

export function useFilesByType(type, params = {}) {
  return useFiles({ ...params, type });
}

export function useStarredFiles(params = {}) {
  return useFiles({ ...params, starred: true });
}

export function useTrashFiles(params = {}) {
  return useFiles({ ...params, deleted: true });
}

// Mutations
export function useUpdateFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data } = await api.patch(`/files/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/files/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
    },
  });
}

export function usePermanentDeleteFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/files/${id}/permanent`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
    },
  });
}

export function useRestoreFile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.post(`/files/${id}/restore`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
    },
  });
}
