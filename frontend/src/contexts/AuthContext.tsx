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
    // Postavi auth state
    setAuthUser(data.user);
    setAuthToken(data.token);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));
      
      // Provjeri da li postoji redirect URL nakon login-a
      const redirectAfterLogin = localStorage.getItem('redirectAfterLogin');
      console.log('🟢 CHECKING redirectAfterLogin:', redirectAfterLogin);
      
      if (redirectAfterLogin) {
        console.log('🟢 FOUND redirectAfterLogin, removing from localStorage');
        localStorage.removeItem('redirectAfterLogin');
        
        // Provjeri da li je redirect URL siguran (samo reports stranice)
        if (redirectAfterLogin.startsWith('/reports/') || redirectAfterLogin.startsWith('/dashboard')) {
          console.log('🟢 VALID redirect URL, redirecting to:', redirectAfterLogin);
          router.push(redirectAfterLogin);
          return;
        } else {
          console.warn('🟢 INVALID redirect URL:', redirectAfterLogin);
        }
      } else {
        console.log('🟢 NO redirectAfterLogin found, redirecting based on role');
      }
    }

    // Role-based redirect
    let redirectPath = '/dashboard';
    switch (data.user.role) {
      case 'FUEL_OPERATOR':
        redirectPath = '/dashboard/fuel';
        break;
      case 'KONTROLA':
        redirectPath = '/dashboard/reports';
        break;
      case 'CARINA':
        redirectPath = '/dashboard/customs';
        break;
      case 'AERODROM':
        redirectPath = '/dashboard/airport';
        break;
      default:
        redirectPath = '/dashboard';
    }

    console.log('🟢 Redirecting to:', redirectPath, 'for role:', data.user.role);
    router.push(redirectPath);
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    }
    setAuthUser(null);
    setAuthToken(null);
    router.push('/');
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
