'use client';

import React from 'react';
import withAuth from '@/components/auth/withAuth';

interface FuelLayoutProps {
  children: React.ReactNode;
}

function FuelLayout({ children }: FuelLayoutProps) {
  return (
    <>
      {children}
    </>
  );
}

export default withAuth(FuelLayout); 