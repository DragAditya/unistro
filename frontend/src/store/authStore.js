import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      // Login
      login: (userData, tokenStr) => set({
        user: userData,
        token: tokenStr,
        isAuthenticated: true,
      }),

      // Logout
      logout: () => set({
        user: null,
        token: null,
        isAuthenticated: false,
      }),

      // Update User
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
      
      // Fetch fresh profile
      fetchUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.user, isAuthenticated: true });
        } catch (err) {
          console.error('Fetch user failed', err);
          set({ user: null, token: null, isAuthenticated: false });
        }
      }
    }),
    {
      name: 'telecloud-auth', // local storage key
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useAuthStore;
