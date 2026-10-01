import { create } from 'zustand';
import { UserProfile } from '../types';

type AuthSession = {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'student' | 'instructor';
  };
  token: string;
};

interface AuthState {
  user?: UserProfile;
  session?: AuthSession;
  loading: boolean;
  setUser: (user: UserProfile | undefined) => void;
  setSession: (session: AuthSession | undefined) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: undefined,
  session: undefined,
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  clearAuth: () => set({ user: undefined, session: undefined })
}));
