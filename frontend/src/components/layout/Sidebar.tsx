'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { getTotalFuelSummary } from '@/lib/apiService';
import { cn } from '@/lib/utils';

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
  Activity,
  Fuel,
  ClipboardList,
  ShieldCheck, // Added ShieldCheck
  Plane, // Added Plane for Airport
  FileText, // Added FileText for activities
  Droplet, // Added Droplet for fuel status
  ShieldAlert, // Added ShieldAlert for fuel consistency
  DollarSign, // Added DollarSign for financial reports
} from 'lucide-react';

// Define new user roles for specific access
enum CustomRole {
  ADMIN = 'ADMIN',
  SERVICER = 'SERVICER',
  FUEL_OPERATOR = 'FUEL_OPERATOR',
  KONTROLA = 'KONTROLA',
  CARINA = 'CARINA',      // New role for customs
  AERODROM = 'AERODROM'   // New role for airport
}

const baseNavItems = [
  { name: 'Početna', href: '/dashboard', icon: Home, roles: ['ADMIN'] },
  { name: 'Vozila', href: '/dashboard/vehicles', icon: Car, roles: ['ADMIN'] },
  { name: 'Firme', href: '/dashboard/companies', icon: Building2, roles: ['ADMIN'] },
  { name: 'Lokacije', href: '/dashboard/locations', icon: MapPin, roles: ['ADMIN'] },
  { name: 'Avio gorivo', href: '/dashboard/fuel', icon: Fuel, roles: ['ADMIN', 'KONTROLA', 'FUEL_OPERATOR'] },
  { name: 'Izvještaji', href: '/dashboard/reports', icon: ClipboardList, roles: ['ADMIN', 'KONTROLA', 'FUEL_OPERATOR'] },
  { name: 'Finansijski izvještaji', href: '/dashboard/financial-reports', icon: DollarSign, roles: ['ADMIN', 'KONTROLA'] },
  { name: 'Statistika i projekcije', href: '/dashboard/statistics', icon: Activity, roles: ['ADMIN', 'KONTROLA', 'FUEL_OPERATOR'] },
  { name: 'Aktivnosti', href: '/aktivnosti', icon: FileText, roles: ['ADMIN', 'KONTROLA'] },
  { name: 'Carina', href: '/dashboard/customs', icon: ShieldCheck, roles: ['ADMIN', 'CARINA'] },
  { name: 'Aerodrom', href: '/dashboard/airport', icon: Plane, roles: ['ADMIN', 'AERODROM'] },
  { name: 'Konzistentnost goriva', href: '/dashboard/fuel-consistency', icon: ShieldAlert, roles: ['ADMIN', 'KONTROLA'] },
  { name: 'Korisnici', href: '/dashboard/users', icon: Users, roles: ['ADMIN'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, authUser } = useAuth();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fuelSummary, setFuelSummary] = useState<{grandTotal: number} | null>(null);
  const [fuelPercentage, setFuelPercentage] = useState(0);
  
  // Fetch total fuel data for the sidebar
  useEffect(() => {
    const fetchFuelData = async () => {
      try {
        const summary = await getTotalFuelSummary();
        setFuelSummary(summary);
        // Set a mock percentage for visualization (you can calculate actual percentage if you have total capacity)
        setFuelPercentage(65); // This is just an example, replace with actual calculation if available
      } catch (error) {
        console.error('Error fetching fuel summary:', error);
      }
    };
    
    fetchFuelData();
  }, []);
  
  // Format number with thousand separator
  const formatNumber = (num: number, decimalPlaces: number = 0) => {
    return num.toLocaleString('bs-BA', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
  };

  // Filter navItems based on user role
  const navItems = baseNavItems.filter(item => 
    authUser && item.roles.includes(authUser.role)
  );

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen);
  };

  const sidebarVariants = {
    expanded: { width: '18rem' },
    collapsed: { width: '5.5rem' },
  };

  return (
    <>
      {/* Mobile menu button - only visible on small screens */}
      <motion.button
        className="fixed top-4 left-4 z-50 p-2 rounded-full bg-primary text-white shadow-lg md:hidden backdrop-blur-lg"
        onClick={toggleMobileSidebar}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </motion.button>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen sidebar-gradient text-white shadow-xl flex flex-col',
          'md:relative md:z-0 backdrop-blur-lg bg-black/20 border-r border-white/10',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'group sidebar-no-scrollbar'
        )}
        variants={sidebarVariants}
        initial={false}
        animate={collapsed ? 'collapsed' : 'expanded'}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onHoverStart={() => setCollapsed(false)}
        onHoverEnd={() => setCollapsed(true)}
      >
        {/* Logo and toggle button */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center space-x-3 overflow-hidden">
            <motion.div
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white font-bold shadow-md"
              animate={{ 
                rotate: collapsed ? 360 : 0,
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                rotate: { duration: 0.5 },
                scale: { repeat: Infinity, repeatType: "reverse", duration: 2 }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19.7 14a6.9 6.9 0 0 0 .3-2V5l-8-3-3.2 1.2"></path>
                <path d="m2 6 8-3 8 3"></path>
                <path d="M12 22v-3"></path>
                <path d="M4.5 10a5.5 5.5 0 1 0 11 0 5.5 5.5 0 1 0-11 0Z"></path>
                <path d="M7.5 10a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0Z"></path>
              </svg>
            </motion.div>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col"
              >
                <h1 className="text-xl font-bold text-white">
                  AvioServis
                </h1>
                <span className="text-xs text-white/60">Admin Panel</span>
              </motion.div>
            )}
          </div>
          <motion.button
            onClick={toggleSidebar}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronRight
              size={16}
              className={`transform transition-transform ${collapsed ? 'rotate-180' : ''}`}
            />
          </motion.button>
        </div>

        {/* User info */}
        {authUser && (
          <div className={cn(
            "py-4 px-4 text-sm border-b border-white/10 relative overflow-hidden",
            collapsed ? "text-center" : "text-left"
          )}>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-600/10 backdrop-blur-sm"></div>
            <div className="relative z-10 flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center font-semibold shadow-md">
                {authUser.username?.charAt(0).toUpperCase()}
              </div>
              {!collapsed && (
                <motion.div 
                  className="flex-1 min-w-0"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="font-medium text-white truncate">{authUser.username}</p>
                  <p className="text-xs text-white/60 truncate">{authUser.role}</p>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-grow p-3 overflow-y-auto sidebar-no-scrollbar">
          <div className={cn(
            "text-xs uppercase text-white/40 font-medium px-3 mb-2",
            collapsed ? "text-center" : "text-left"
          )}>
            {!collapsed ? "Navigacija" : "Menu"}
          </div>
          <ul className="space-y-1">
            {navItems.map((item, idx) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              const Icon = item.icon;
              
              return (
                <motion.li 
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center rounded-xl transition-all duration-200 overflow-hidden backdrop-blur-md',
                      isActive
                        ? 'bg-gradient-to-r from-[#E60026] to-[#4D000A] text-white shadow-lg border border-white/10'
                        : 'text-white/80 hover:bg-white/10 border border-transparent',
                      collapsed ? 'justify-center p-3 my-2' : 'p-3 space-x-3'
                    )}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        'flex items-center justify-center',
                        isActive ? 'text-white' : 'text-white/70'
                      )}
                    >
                      <Icon size={collapsed ? 20 : 18} />
                    </motion.div>
                    {!collapsed && (
                      <span className={isActive ? 'font-medium' : ''}>{item.name}</span>
                    )}
                    {!collapsed && isActive && (
                      <motion.div
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-white"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                      />
                    )}
                  </Link>
                </motion.li>
              );
            })}
          </ul>

          {/* Statistics section */}
          {!collapsed && (
            <motion.div 
              className="mt-6 px-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-xs uppercase text-white/40 font-medium mb-2">Statistika</div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Droplet size={14} className="text-[#E60026]" />
                    <span className="text-sm">Ukupno stanje goriva</span>
                  </div>
                  <span className="font-bold text-[#E60026]">{fuelSummary ? formatNumber(fuelSummary.grandTotal, 1) : '0'} L</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-[#E60026] to-[#4D000A] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${fuelPercentage}%` }}
                    transition={{ delay: 0.5, duration: 1 }}
                  />
                </div>
                <p className="text-xs text-white/60 mt-1">{fuelPercentage}% ukupnog kapaciteta</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer with logout */}
        <div className="p-4 border-t border-white/10 space-y-2 bg-black/10 backdrop-blur-md">
          <motion.button
            onClick={logout}
            className={cn(
              'w-full flex items-center rounded-xl transition-all duration-200 p-3 backdrop-blur-sm',
              'border border-[#E60026]/20 bg-gradient-to-r from-[#E60026]/20 to-[#4D000A]/20',
              'hover:from-[#E60026]/30 hover:to-[#4D000A]/30 text-white',
              collapsed ? 'justify-center' : 'space-x-3'
            )}
            whileHover={{ y: -2 }}
            whileTap={{ y: 0 }}
          >
            <LogOut size={collapsed ? 20 : 18} />
            {!collapsed && <span>Odjavi se</span>}
          </motion.button>
        </div>
      </motion.aside>
    </>
  );
}
