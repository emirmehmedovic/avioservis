'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials } from '@/lib/utils';

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const pathname = usePathname();
  const { authUser } = useAuth();

  // Define breadcrumb type
  type Breadcrumb = {
    name: string;
    path: string;
    isLast: boolean;
  };

  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = (): Breadcrumb[] => {
    if (!pathname) return [];
    
    const segments = pathname.split('/').filter(Boolean);
    
    // Map for translating path segments to human-readable names
    const pathMap: Record<string, string> = {
      'dashboard': 'Početna',
      'vehicles': 'Vozila',
      'companies': 'Firme',
      'locations': 'Lokacije',
      'users': 'Korisnici',
      'details': 'Detalji',
      'edit': 'Izmjena',
      'new': 'Novi',
    };
    
    return segments.map((segment, index) => {
      // Skip numeric IDs in breadcrumbs
      if (/^\d+$/.test(segment)) return null;
      
      const displayName = pathMap[segment] || segment;
      
      return {
        name: displayName,
        path: `/${segments.slice(0, index + 1).join('/')}`,
        isLast: index === segments.length - 1
      };
    }).filter((item): item is Breadcrumb => item !== null);
  };
  
  const breadcrumbs = generateBreadcrumbs();

  return (
    <header className="bg-card border-b border-border py-3 px-4 md:px-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          {title ? (
            <>
              <h1 className="text-xl font-semibold">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </>
          ) : (
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className="inline-flex items-center">
                    {index > 0 && (
                      <svg className="w-3 h-3 text-muted-foreground mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                      </svg>
                    )}
                    <span className={`inline-flex items-center text-sm font-medium ${crumb.isLast ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      {crumb.name}
                    </span>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>
            
            {showNotifications && (
              <motion.div 
                className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-md shadow-lg z-50"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="p-4 border-b border-border">
                  <h3 className="font-medium">Obavještenja</h3>
                </div>
                <div className="p-2 max-h-80 overflow-y-auto">
                  <div className="p-3 hover:bg-muted rounded-md transition-colors">
                    <p className="text-sm font-medium">Servis vozila uskoro</p>
                    <p className="text-xs text-muted-foreground">Vozilo BMW X5 ima zakazan servis za 3 dana</p>
                    <p className="text-xs text-muted-foreground mt-1">Prije 2 sata</p>
                  </div>
                  <div className="p-3 hover:bg-muted rounded-md transition-colors">
                    <p className="text-sm font-medium">Registracija ističe</p>
                    <p className="text-xs text-muted-foreground">Vozilu Mercedes Sprinter ističe registracija za 7 dana</p>
                    <p className="text-xs text-muted-foreground mt-1">Prije 1 dan</p>
                  </div>
                </div>
                <div className="p-2 border-t border-border">
                  <button className="w-full text-center text-sm text-primary p-2 hover:bg-muted rounded-md transition-colors">
                    Pogledaj sva obavještenja
                  </button>
                </div>
              </motion.div>
            )}
          </div>
          
          <div className="relative">
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                {authUser ? getInitials(authUser.username) : 'U'}
              </div>
              <span className="hidden md:inline text-sm">{authUser?.username}</span>
            </Button>
            
            {showProfile && (
              <motion.div 
                className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-md shadow-lg z-50"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="p-4 border-b border-border">
                  <p className="font-medium">{authUser?.username}</p>
                  <p className="text-xs text-muted-foreground">{authUser?.role}</p>
                </div>
                <div className="p-2">
                  <button className="w-full text-left flex items-center space-x-2 p-2 hover:bg-muted rounded-md transition-colors">
                    <User size={16} />
                    <span className="text-sm">Moj profil</span>
                  </button>
                  <button className="w-full text-left flex items-center space-x-2 p-2 hover:bg-muted rounded-md transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings">
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <span className="text-sm">Postavke</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
