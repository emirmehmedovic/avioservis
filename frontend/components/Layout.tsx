import React, { ReactNode } from 'react';
import NotificationBell from '@/components/NotificationBell';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-blue-900 text-white px-6 py-4 shadow flex items-center justify-between">
        <div className="font-bold text-lg">DATA-AVIOSERVIS Admin</div>
        <div className="flex items-center gap-4">
          <NotificationBell className="text-white" />
        </div>
      </nav>
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
