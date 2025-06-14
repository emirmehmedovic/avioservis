'use client';

import React, { ComponentType, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const withAuth = <P extends object>(
  WrappedComponent: ComponentType<P>,
  allowedRoles?: string[] // Optional array of allowed roles
) => {
  const ComponentWithAuth = (props: P) => {
    const { authToken, isLoading, authUser } = useAuth();
    const router = useRouter();

    useEffect(() => {
      console.log('[withAuth] useEffect triggered. Current state:', {
        isLoading,
        authToken: authToken ? '******' : null, // Mask token for security
        authUser,
        authUserRole: authUser ? authUser.role : 'N/A',
        allowedRoles,
      });

      if (isLoading) {
        console.log('[withAuth] isLoading is true, returning.');
        return; // Don't do anything while loading
      }

      if (!authToken) {
        console.log('[withAuth] No authToken, redirecting to /login');
        router.replace('/login');
        return;
      }

      // Role checking
      if (allowedRoles && allowedRoles.length > 0 && authUser) {
        console.log('[withAuth] Checking roles. User role:', authUser.role, 'Allowed roles:', allowedRoles);
        if (!allowedRoles.includes(authUser.role)) {
          console.log('[withAuth] Role not allowed, redirecting to /dashboard');
          router.replace('/dashboard'); 
        }
      } else {
        console.log('[withAuth] Role check skipped or authUser not available for role check yet.');
      }
    }, [isLoading, authToken, authUser, router, allowedRoles]);

    if (isLoading || (!authToken && typeof window !== 'undefined')) {
      console.log('[withAuth] Rendering loading/redirecting indicator (isLoading or !authToken)');
      // Show loading indicator while checking auth or if redirecting
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <p>Provjera autentifikacije i autorizacije...</p>
        </div>
      );
    }
    
    // If user is authenticated and (no specific roles required OR user's role is allowed)
    if (authUser && (!allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(authUser.role))) {
      return <WrappedComponent {...props} />;
    }

    console.log('[withAuth] Rendering fallback loading/access check indicator.');
    // Fallback if still loading or about to redirect, or if roles don't match but useEffect hasn't redirected yet
    // This also covers the brief moment before the useEffect redirect logic kicks in
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Provjera pristupa...</p> 
      </div>
    );
  };

  ComponentWithAuth.displayName = `WithAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return ComponentWithAuth;
};

export default withAuth;
