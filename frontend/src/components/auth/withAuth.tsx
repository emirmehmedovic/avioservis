'use client';

import React, { ComponentType, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const withAuth = <P extends object>(
  WrappedComponent: ComponentType<P>,
  allowedRoles?: string[] // Optional array of allowed roles
) => {
  const ComponentWithAuth = (props: P) => {
    const { authToken, isLoading: authContextIsLoading, authUser } = useAuth();
    const router = useRouter();
    const [clientHasMounted, setClientHasMounted] = useState(false);

    useEffect(() => {
      // This effect runs once on the client after initial mount.
      setClientHasMounted(true);
    }, []); // Empty dependency array ensures it runs only once on mount.

    useEffect(() => {
      // This effect handles authentication and authorization logic.
      // It waits for the client to mount and for the auth context to finish loading.
      if (!clientHasMounted || authContextIsLoading) {
        console.log('[withAuth] Auth Effect: Waiting for client mount or auth context to load. State:', { clientHasMounted, authContextIsLoading });
        return; 
      }

      console.log('[withAuth] Auth Effect: Client mounted & auth context loaded. Checking auth. State:', {
        authToken: authToken ? '******' : null, // Mask token for security
        authUser,
        authUserRole: authUser ? authUser.role : 'N/A',
        allowedRoles,
      });

      if (!authToken) {
        console.log('[withAuth] Auth Effect: No authToken, redirecting to /login');
        router.replace('/login');
        return;
      }

      // Role checking
      if (allowedRoles && allowedRoles.length > 0) {
        if (!authUser) {
          // This can happen if authToken is present but user details are still being fetched.
          console.log('[withAuth] Auth Effect: Role check required, but authUser not yet available. Auth context might be resolving user or state is inconsistent.');
          return; // Wait for authUser to be populated if roles are required
        }
        console.log('[withAuth] Auth Effect: Checking roles. User role:', authUser.role, 'Allowed roles:', allowedRoles);
        if (!allowedRoles.includes(authUser.role)) {
          console.log('[withAuth] Auth Effect: Role not allowed, redirecting to /dashboard');
          router.replace('/dashboard');
          return;
        }
      }
      console.log('[withAuth] Auth Effect: Auth checks passed or no specific roles required.');
    }, [clientHasMounted, authContextIsLoading, authToken, authUser, router]);

    // --- Render Logic ---

    // 1. Server-side rendering OR client hasn't mounted OR auth context is loading:
    //    Always show a generic loader. This ensures SSG always outputs this.
    if (typeof window === 'undefined' || !clientHasMounted || authContextIsLoading) {
      console.log('[withAuth] Render: Loader (SSR, client not mounted, or auth context loading). State:', { isSSR: typeof window === 'undefined', clientHasMounted, authContextIsLoading });
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <p>Provjera autentifikacije i autorizacije...</p>
        </div>
      );
    }

    // 2. Client-side, mounted, and auth context is NOT loading.
    //    Now, make decisions based on authentication and authorization state.
    //    The useEffect above is responsible for initiating redirects.

    if (!authToken) {
      // useEffect should have redirected. This is a fallback display while redirecting.
      console.log('[withAuth] Render: No authToken (client-side, after load). Awaiting redirect to /login.');
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <p>Preusmjeravanje na prijavu...</p>
        </div>
      );
    }

    // Token exists. Check roles for rendering.
    if (allowedRoles && allowedRoles.length > 0) {
      if (!authUser) {
        // Token exists, roles required, but authUser not yet populated. Show loader.
        console.log('[withAuth] Render: AuthToken present, roles required, but authUser not yet available. Loading user data...');
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <p>Učitavanje korisničkih podataka...</p>
          </div>
        );
      }
      if (!allowedRoles.includes(authUser.role)) {
        // Role mismatch. useEffect should have redirected. Fallback display.
        console.log('[withAuth] Render: Role not allowed (client-side, after load). Awaiting redirect to /dashboard.');
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <p>Pristup odbijen. Preusmjeravanje...</p>
          </div>
        );
      }
    }

    // All checks passed: client-side, auth context loaded, token exists, and roles (if any) are met.
    console.log('[withAuth] Render: Authenticated and authorized. Rendering WrappedComponent.');
    return <WrappedComponent {...props} />;
  };

  ComponentWithAuth.displayName = `WithAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return ComponentWithAuth;
};

export default withAuth;
