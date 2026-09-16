import { create } from "zustand";
import { User } from "./types";
import { api } from "./api";

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  userCoords: { lat: number; lon: number } | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setUserCoords: (coords: { lat: number; lon: number } | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("access_token") : null,
  user: null,
  isLoading: true,
  userCoords: null,

  setToken: (token) => {
    if (token) {
      localStorage.setItem("access_token", token);
    } else {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
    set({ token });
  },

  setUser: (user) => set({ user }),

  setUserCoords: (userCoords) => set({ userCoords }),

  login: async (email, password) => {
    const tokens = await api.login(email, password);
    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);
    set({ token: tokens.access_token });
    const me = await api.getMe();
    set({ user: me, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ token: null, user: null, isLoading: false });
  },

  fetchMe: async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) {
      set({ user: null, isLoading: false });
      return;
    }
    try {
      const me = await api.getMe();
      set({ user: me, token, isLoading: false });
    } catch {
      localStorage.removeItem("access_token");
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
