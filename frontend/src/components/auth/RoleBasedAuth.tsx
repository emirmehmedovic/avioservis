'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

// Define page access permissions by role
const PAGE_ACCESS_MAP: Record<string, UserRole[]> = {
  '/dashboard': [UserRole.ADMIN],
  '/dashboard/vehicles': [UserRole.ADMIN],
  '/dashboard/fuel': [UserRole.ADMIN, UserRole.KONTROLA, UserRole.FUEL_OPERATOR],
  '/dashboard/fuel/projections': [UserRole.ADMIN, UserRole.KONTROLA, UserRole.FUEL_OPERATOR],
  '/dashboard/reports': [UserRole.ADMIN, UserRole.KONTROLA, UserRole.FUEL_OPERATOR],
  '/dashboard/statistics': [UserRole.ADMIN, UserRole.KONTROLA, UserRole.FUEL_OPERATOR],
  '/dashboard/financial-reports': [UserRole.ADMIN, UserRole.KONTROLA],
  '/dashboard/customs': [UserRole.ADMIN, UserRole.CARINA],
  '/dashboard/airport': [UserRole.ADMIN, UserRole.AERODROM],
  '/dashboard/companies': [UserRole.ADMIN],
  '/dashboard/locations': [UserRole.ADMIN],
  '/dashboard/users': [UserRole.ADMIN],
  '/aktivnosti': [UserRole.ADMIN, UserRole.KONTROLA, UserRole.FUEL_OPERATOR],
};

// Component to check if user has access to the current page
export default function RoleBasedAuth({ children }: { children: React.ReactNode }) {
  const { authUser, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip if pathname is null
    if (!pathname) return;
    
    // Skip check if still loading or on login page
    if (isLoading || pathname === '/login') {
      return;
    }

    // Redirect to login if not authenticated
    if (!authUser) {
      router.push('/login');
      return;
    }

    // Check if current path requires specific role access
    const isPathRestricted = Object.keys(PAGE_ACCESS_MAP).some(path => 
      pathname.startsWith(path)
    );

    if (isPathRestricted) {
      // Find the most specific matching path
      const matchingPaths = Object.keys(PAGE_ACCESS_MAP)
        .filter(path => pathname.startsWith(path))
        .sort((a, b) => b.length - a.length); // Sort by length descending to get most specific match
      
      const matchingPath = matchingPaths[0];
      
      if (matchingPath) {
        const allowedRoles = PAGE_ACCESS_MAP[matchingPath];
        const hasAccess = allowedRoles.includes(authUser.role);
        
        if (!hasAccess) {
          // Determine where to redirect based on user role
          let redirectPath = '/dashboard';
          
          switch (authUser.role) {
            case UserRole.CARINA:
              redirectPath = '/dashboard/customs';
              break;
            case UserRole.AERODROM:
              redirectPath = '/dashboard/airport';
              break;
            case UserRole.KONTROLA:
              redirectPath = '/dashboard/reports';
              break;
            default:
              redirectPath = '/dashboard';
          }
          
          router.push(redirectPath);
        }
      }
    }
  }, [authUser, isLoading, pathname, router]);

  // Show nothing while loading
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return <>{children}</>;
}
