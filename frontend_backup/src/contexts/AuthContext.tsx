'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User, LoginResponse } from '@/lib/apiService'; // Assuming User and LoginResponse types are exported from apiService

interface AuthContextType {
  authUser: User | null;
  authToken: string | null;
  isLoading: boolean;
  login: (data: LoginResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const router = useRouter();

  useEffect(() => {
    // Check localStorage on initial load
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      const userJson = localStorage.getItem('authUser');
      if (token && userJson) {
        try {
          setAuthUser(JSON.parse(userJson));
          setAuthToken(token);
        } catch (error) {
          console.error("Failed to parse authUser from localStorage", error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = (data: LoginResponse) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));
    }
    setAuthUser(data.user);
    setAuthToken(data.token);
    router.push('/dashboard');
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    }
    setAuthUser(null);
    setAuthToken(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ authUser, authToken, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
