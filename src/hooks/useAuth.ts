'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthTokens, LoginCredentials, RegisterData } from '@/lib/types';
import { apiClient } from '@/lib/api/client';

interface AuthStore {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
        const response = await apiClient.login(credentials);
        
        if (response.success && response.data) {
          const { user, tokens } = response.data;
          apiClient.setAccessToken(tokens.accessToken);
          
          set({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return true;
        }
        
        set({
          isLoading: false,
          error: response.error || 'Błąd logowania',
        });
        return false;
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        
        const response = await apiClient.register(data);
        
        if (response.success && response.data) {
          const { user, tokens } = response.data;
          apiClient.setAccessToken(tokens.accessToken);
          
          set({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return true;
        }
        
        set({
          isLoading: false,
          error: response.error || 'Błąd rejestracji',
        });
        return false;
      },

      logout: async () => {
        set({ isLoading: true });
        
        await apiClient.logout();
        apiClient.setAccessToken(null);
        
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      refreshToken: async () => {
        const { tokens } = get();
        
        if (!tokens?.refreshToken) {
          return false;
        }
        
        const response = await apiClient.refreshToken(tokens.refreshToken);
        
        if (response.success && response.data) {
          const newTokens = {
            ...tokens,
            accessToken: response.data.accessToken,
            expiresIn: response.data.expiresIn,
          };
          
          apiClient.setAccessToken(newTokens.accessToken);
          set({ tokens: newTokens });
          return true;
        }
        
        // Token refresh failed, logout
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
        });
        return false;
      },

      checkAuth: async () => {
        const { tokens } = get();
        
        if (!tokens?.accessToken) {
          set({ isAuthenticated: false, user: null });
          return;
        }
        
        apiClient.setAccessToken(tokens.accessToken);
        
        const response = await apiClient.getMe();
        
        if (response.success && response.data) {
          set({ user: response.data, isAuthenticated: true });
        } else {
          // Try to refresh token
          const refreshed = await get().refreshToken();
          if (!refreshed) {
            set({ user: null, tokens: null, isAuthenticated: false });
          }
        }
      },

      clearError: () => set({ error: null }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tokens: state.tokens,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
