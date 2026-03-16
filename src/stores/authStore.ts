import { create } from 'zustand';
import { api, setTokens, clearTokens } from '../api/http';
import { wsClient } from '../api/ws';
import type { User, TokenPair } from '../api/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    code: string,
    username: string,
    displayName: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  updateProfile: (data: {
    display_name?: string;
    avatar_url?: string;
  }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (username, password) => {
    const tokens = await api<TokenPair>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setTokens(tokens.access_token, tokens.refresh_token);
    const user = await api<User>('/api/users/me');
    set({ user });
    wsClient.connect();
  },

  register: async (code, username, displayName, password) => {
    const tokens = await api<TokenPair>('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        code,
        username,
        display_name: displayName,
        password,
      }),
    });
    setTokens(tokens.access_token, tokens.refresh_token);
    const user = await api<User>('/api/users/me');
    set({ user });
    wsClient.connect();
  },

  logout: () => {
    clearTokens();
    wsClient.disconnect();
    set({ user: null });
  },

  fetchMe: async () => {
    try {
      const user = await api<User>('/api/users/me');
      set({ user, loading: false });
      wsClient.connect();
    } catch {
      set({ user: null, loading: false });
    }
  },

  updateProfile: async (data) => {
    const user = await api<User>('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    set({ user });
  },
}));
