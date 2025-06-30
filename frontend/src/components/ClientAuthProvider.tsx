'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

// Dynamic import for AuthProvider to disable SSR
const AuthProvider = dynamic(
  () => import("@/contexts/AuthContext").then((mod) => ({ default: mod.AuthProvider })),
  { 
    ssr: false,
    loading: () => <div style={{ display: 'none' }}>Loading...</div>
  }
);

interface ClientAuthProviderProps {
  children: ReactNode;
}

export default function ClientAuthProvider({ children }: ClientAuthProviderProps) {
  return <AuthProvider>{children}</AuthProvider>;
} 