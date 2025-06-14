'use client';

import React from 'react';
import VehicleDetailsPage from '@/components/vehicles/details/VehicleDetailsPage';
import withAuth from '@/components/auth/withAuth';

const VehiclePage = () => {
  return <VehicleDetailsPage />;
};

export default withAuth(VehiclePage);
