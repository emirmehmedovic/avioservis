'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import { loginUser, LoginResponse } from '@/lib/apiService'; 
import { useAuth } from '@/contexts/AuthContext'; 
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { UserIcon, LockClosedIcon, BeakerIcon, ClockIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter(); 
  const { login, authToken, isLoading: authIsLoading, authUser } = useAuth(); 

  useEffect(() => {
    if (!authIsLoading && authToken && authUser) {
      router.push('/dashboard');
    }
  }, [authToken, authIsLoading, authUser, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!username || !password) {
      setError('Korisničko ime i lozinka su obavezni.');
      setLoading(false);
      return;
    }

    if (username.length < 3) {
        setError('Korisničko ime mora imati bar 3 karaktera.');
        setLoading(false);
        return;
    }
    if (password.length < 6) {
        setError('Lozinka mora imati bar 6 karaktera.');
        setLoading(false);
        return;
    }

    try {
      const data: LoginResponse = await loginUser({ username, password });
      login(data); 
    } catch (err: any) {
      console.error('Login page error:', err);
      setError(err.message || 'Došlo je do greške prilikom prijave.');
    } finally {
      setLoading(false);
    }
  };

  if (authIsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#363636] via-[#000000] to-[#363636] flex items-center justify-center text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="backdrop-blur-lg bg-white/10 rounded-xl border border-white/20 px-8 py-6 shadow-xl"
        >
          <div className="flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-[#E60026] mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xl font-medium">Učitavanje...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (authUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#363636] via-[#000000] to-[#363636] flex items-center justify-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="backdrop-blur-lg bg-white/10 rounded-xl border border-white/20 p-8 shadow-xl max-w-md w-full z-10"
        >
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-[#363636] to-black p-1 flex items-center justify-center shadow-lg"
            >
              <div className="text-[#E60026] font-bold text-xl">AVIO</div>
            </motion.div>
          </div>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white">Dobrodošli nazad</h2>
            <p className="text-white/70 mt-2">Prijavite se da nastavite</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-b from-[#363636] via-[#000000] to-[#363636] text-white overflow-hidden">
      {/* Left Side - Image (visible only on md and larger screens) */}
      <div className="hidden md:flex md:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent z-10"></div>
        <Image 
          src="/slika.png" 
          alt="AvioServis Background" 
          fill 
          className="object-cover"
          priority
        />
        
        <div className="relative z-20 flex flex-col justify-center px-12 h-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-2">AvioServis</h1>
            <p className="text-xl text-white/80 mb-12">Profesionalno upravljanje avionskim gorivom</p>
            
            <div className="space-y-6">
              <motion.div 
                className="flex items-center space-x-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="p-2 rounded-full bg-[#F08080]/30 backdrop-blur-md border border-white/20">
                  <PaperAirplaneIcon className="h-6 w-6 text-white rotate-45" />
                </div>
                <div>
                  <h3 className="font-medium">Efikasno Upravljanje</h3>
                  <p className="text-sm text-white/70">Optimizirano za avio kompanije</p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex items-center space-x-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <div className="p-2 rounded-full bg-[#F08080]/30 backdrop-blur-md border border-white/20">
                  <BeakerIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-medium">Precizno Praćenje</h3>
                  <p className="text-sm text-white/70">Detaljna evidencija zaliha goriva</p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex items-center space-x-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <div className="p-2 rounded-full bg-[#F08080]/30 backdrop-blur-md border border-white/20">
                  <ClockIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-medium">Brze Operacije</h3>
                  <p className="text-sm text-white/70">Smanjeno vrijeme točenja goriva</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Mobile Banner (visible only on small screens) */}
      <div className="md:hidden relative h-48 w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-transparent z-10"></div>
        <Image 
          src="/slika.png" 
          alt="AvioServis Background" 
          fill 
          className="object-cover"
          priority
        />
        <div className="relative z-20 flex flex-col justify-center items-center h-full p-4">
          <h1 className="text-3xl font-bold">AvioServis</h1>
          <p className="text-white/80">Upravljanje avionskim gorivom</p>
        </div>
      </div>
      
      {/* Right Side - Login Form */}
      <div className="flex flex-1 md:w-1/2 items-center justify-center px-4 py-8 md:py-0 relative">
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            className="absolute top-0 left-0 w-64 h-64 bg-[#E60026]/10 rounded-full blur-3xl"
            animate={{ 
              x: [0, 100, 0], 
              y: [0, 50, 0],
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 15, 
              ease: "easeInOut" 
            }}
          />
          <motion.div 
            className="absolute bottom-0 right-0 w-96 h-96 bg-[#800014]/10 rounded-full blur-3xl"
            animate={{ 
              x: [0, -100, 0], 
              y: [0, -50, 0],
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 20, 
              ease: "easeInOut" 
            }}
          />
        </div>
        
        <div className="flex flex-col w-full max-w-md relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="backdrop-blur-lg bg-white/10 rounded-xl border border-white/20 p-8 w-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative"
            style={{
              boxShadow: "0 0 15px rgba(230, 0, 38, 0.1), 0 0 30px rgba(230, 0, 38, 0.05)",
              background: "linear-gradient(to bottom right, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))"
            }}
          >
            {/* Red glow in corners */}
            <div className="absolute -top-2 -left-2 w-16 h-16 bg-[#E60026]/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-[#E60026]/20 rounded-full blur-xl"></div>
            
            <h1 className="text-3xl font-bold text-center text-white mb-2">
              Admin Prijava
            </h1>
            <p className="text-white/70 text-center mb-8">
              Prijavite se za pristup admin panelu
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label 
                  htmlFor="username" 
                  className="block text-sm font-medium text-white/90 mb-1"
                >
                  Korisničko ime
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/60 group-focus-within:text-[#E60026] transition-colors duration-200">
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <motion.input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    className="block w-full pl-10 pr-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl shadow-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#E60026]/50 focus:border-[#B3001F] text-white transition-all duration-200"
                    placeholder="korisnicko.ime"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    whileFocus={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  />
                </div>
              </div>

              <div>
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-white/90 mb-1"
                >
                  Lozinka
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/60 group-focus-within:text-[#E60026] transition-colors duration-200">
                    <LockClosedIcon className="h-5 w-5" />
                  </div>
                  <motion.input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="block w-full pl-10 pr-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl shadow-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#E60026]/50 focus:border-[#B3001F] text-white transition-all duration-200"
                    placeholder="*******"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    whileFocus={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  />
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-[#E60026] focus:ring-[#E60026]/50 focus:ring-offset-0"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-white/70">
                  Zapamti me
                </label>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    className="bg-[#E60026]/20 backdrop-blur-sm border border-[#E60026]/30 text-white px-4 py-3 rounded-xl relative" 
                    role="alert"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="flex items-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-[#E60026]">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-2">
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl text-white bg-gradient-to-r from-[#E60026] to-[#4D000A] hover:from-[#B3001F] hover:to-[#800014] focus:outline-none focus:ring-2 focus:ring-[#E60026]/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  whileHover={{ y: -3 }}
                  whileTap={{ y: 0 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Prijava u toku...
                    </div>
                  ) : "Prijavi se"}
                </motion.button>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <Link href="/" className="text-sm text-white/60 hover:text-white hover:text-[#E60026] transition-colors duration-200 flex items-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="M19 12H5M12 19l-7-7 7-7"></path>
                  </svg>
                  Natrag na početnu
                </Link>
                <Link href="/reset-password" className="text-sm text-white/60 hover:text-[#E60026] transition-colors duration-200">
                  Zaboravljena lozinka?
                </Link>
              </div>
            </form>
          </motion.div>
          
          <motion.footer 
            className="mt-6 text-center text-sm text-white/60 relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="flex justify-center space-x-4 mb-2">
              <select 
                className="bg-white/5 text-white/70 text-xs rounded-lg border border-white/10 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#E60026]/30"
                defaultValue="bs"
              >
                <option value="bs">Bosanski</option>
                <option value="en">English</option>
              </select>
            </div>
            <p>&copy; {new Date().getFullYear()} AvioServis. Sva prava zadržana.</p>
            <p className="text-xs text-white/40 mt-1">v1.2.0</p>
          </motion.footer>
        </div>
      </div>
    </div>
  );
}
