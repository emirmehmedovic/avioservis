import { create } from 'zustand';
// Ako koristite TypeScript, preporučuje se instalirati @types/zustand ili koristiti zustand@4+ koji ima tipove.
// Ako tipovi fale, instalirajte: npm install --save-dev @types/zustand

export interface User {
  id: number;
  username: string;
  role: string;
}

interface UserState {
  user: User | null;
  token: string | null;
  setUser: (user: User, token: string) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set: (partial: Partial<UserState>) => void) => ({
  user: null,
  token: null,
  setUser: (user: User, token: string) => set({ user, token }),
  clearUser: () => set({ user: null, token: null })
}));
