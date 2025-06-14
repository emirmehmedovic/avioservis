'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import {
  Home,
  Car,
  Building2,
  MapPin,
  Users,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Settings,
} from 'lucide-react';

const navItems = [
  { name: 'Početna', href: '/dashboard', icon: Home },
  { name: 'Vozila', href: '/dashboard/vehicles', icon: Car },
  { name: 'Firme', href: '/dashboard/companies', icon: Building2 },
  { name: 'Lokacije', href: '/dashboard/locations', icon: MapPin },
  { name: 'Korisnici', href: '/dashboard/users', icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, authUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen);
  };

  const sidebarVariants = {
    expanded: { width: '16rem' },
    collapsed: { width: '5rem' },
  };

  return (
    <>
      {/* Mobile menu button - only visible on small screens */}
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-avioBlue-500 text-white shadow-lg md:hidden"
        onClick={toggleMobileSidebar}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen bg-gradient-to-b from-avioBlue-900 to-avioBlue-700 text-white shadow-xl flex flex-col transition-all',
          'md:relative md:z-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        variants={sidebarVariants}
        initial={false}
        animate={collapsed ? 'collapsed' : 'expanded'}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Logo and toggle button */}
        <div className="flex items-center justify-between p-4 border-b border-avioBlue-600">
          <div className="flex items-center space-x-2 overflow-hidden">
            <motion.div
              className="flex items-center justify-center w-8 h-8 rounded-md bg-white text-avioBlue-600 font-bold"
              animate={{ rotate: collapsed ? 360 : 0 }}
              transition={{ duration: 0.5 }}
            >
              A
            </motion.div>
            {!collapsed && (
              <motion.h1
                className="text-xl font-bold"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                AvioServis
              </motion.h1>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-avioBlue-600 hover:bg-avioBlue-500 transition-colors"
          >
            <ChevronRight
              size={14}
              className={`transform transition-transform ${collapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* User info */}
        {authUser && (
          <div className={cn(
            "p-4 text-sm text-avioBlue-100 border-b border-avioBlue-600",
            collapsed ? "text-center" : "text-left"
          )}>
            {collapsed ? (
              <div className="w-8 h-8 mx-auto rounded-full bg-avioBlue-500 flex items-center justify-center font-semibold">
                {authUser.username?.charAt(0).toUpperCase()}
              </div>
            ) : (
              <>
                <p className="font-medium text-white truncate">{authUser.username}</p>
                <p className="text-xs opacity-75 truncate">{authUser.role}</p>
              </>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-grow p-4 overflow-y-auto">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center rounded-md transition-all duration-200 overflow-hidden',
                      isActive
                        ? 'bg-avioBlue-500 text-white shadow-md'
                        : 'text-avioBlue-100 hover:bg-avioBlue-600 hover:text-white',
                      collapsed ? 'justify-center p-3' : 'p-3 space-x-3'
                    )}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon size={collapsed ? 22 : 18} />
                    </motion.div>
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer with theme toggle and logout */}
        <div className="p-4 border-t border-avioBlue-600 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <ThemeToggle />
            {!collapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xs text-avioBlue-100"
              >
                Tema
              </motion.div>
            )}
          </div>
          <button
            onClick={logout}
            className={cn(
              'w-full flex items-center rounded-md transition-all duration-200 p-3 text-avioBlue-100 hover:bg-red-600 hover:text-white',
              collapsed ? 'justify-center' : 'space-x-3'
            )}
          >
            <LogOut size={collapsed ? 22 : 18} />
            {!collapsed && <span>Odjavi se</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
