import React from 'react';
import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r h-full p-4 hidden md:block">
      <nav className="space-y-2">
        <Link href="/dashboard" className="block py-2 px-4 rounded hover:bg-blue-100">Dashboard</Link>
        <Link href="/users" className="block py-2 px-4 rounded hover:bg-blue-100">Korisnici</Link>
        <Link href="/company" className="block py-2 px-4 rounded hover:bg-blue-100">Firme</Link>
        <Link href="/location" className="block py-2 px-4 rounded hover:bg-blue-100">Lokacije</Link>
        <Link href="/vehicle" className="block py-2 px-4 rounded hover:bg-blue-100">Vozila</Link>
      </nav>
    </aside>
  );
}
