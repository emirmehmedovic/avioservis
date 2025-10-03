'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import ReportViewer from '@/components/analytics/ReportViewer';

interface ReportPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default function ReportPage({ params }: ReportPageProps) {
  const router = useRouter();
  const { token } = use(params);

  const handleBack = () => {
    router.push('/dashboard/analitika-komparacija');
  };

  return (
    <ReportViewer 
      token={token} 
      onBack={handleBack}
    />
  );
}
