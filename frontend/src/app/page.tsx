"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ReactNode } from "react";
import { 
  motion,
  AnimatePresence,
  MotionProps
} from "framer-motion";
import Link from "next/link";

// Types for component props
type FadeInProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

type CardProps = {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
};

type ButtonProps = {
  children: ReactNode;
  primary?: boolean;
  className?: string;
};

// Animated components with framer-motion
const FadeIn = ({ children, delay = 0, className = "" }: FadeInProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    viewport={{ once: true }}
    className={className}
  >
    {children}
  </motion.div>
);

// Modern Card component
const Card = ({ children, className = "", hoverEffect = true }: CardProps) => (
  <motion.div
    className={`backdrop-blur-lg bg-black/20 rounded-2xl p-8 border border-white/20 shadow-lg ${
      hoverEffect ? "hover:shadow-xl transition-all duration-300" : ""
    } ${className}`}
    whileHover={hoverEffect ? { y: -5, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" } : {}}
  >
    {children}
  </motion.div>
);

// Button component
const Button = ({ children, primary = false, className = "" }: ButtonProps) => (
  <motion.button
    className={`rounded-full px-8 py-4 font-bold transition duration-300 text-lg ${
      primary
        ? "bg-white text-[var(--clr-hope-100)] hover:bg-opacity-90 shadow-lg"
        : "bg-transparent border-2 border-white hover:bg-white/10"
    } ${className}`}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.98 }}
  >
    {children}
  </motion.button>
);

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page when component mounts
    router.replace('/login');
  }, [router]);

  // Return a loading state or nothing since we're redirecting
  return (
    <div className="min-h-screen hope-gradient text-white overflow-hidden flex justify-center items-center">
      <div className="backdrop-blur-lg bg-white/10 rounded-xl border border-white/20 p-8 shadow-xl">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-[#E60026] mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xl font-medium">Preusmjeravanje...</span>
        </div>
      </div>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-black/20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold">AvioServis</div>
          <div className="hidden md:flex space-x-8">
            <a href="#features" className="hover:text-white/80 transition-colors">Funkcionalnosti</a>
            <a href="#benefits" className="hover:text-white/80 transition-colors">Prednosti</a>
            <a href="#testimonials" className="hover:text-white/80 transition-colors">Klijenti</a>
            <a href="#contact" className="hover:text-white/80 transition-colors">Kontakt</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button className="px-6">
                <span className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    <polyline points="10 17 15 12 10 7"></polyline>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                  </svg>
                  Login
                </span>
              </Button>
            </Link>
            <Button primary>Zatražite Demo</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen w-full flex items-center overflow-hidden">
        {/* Background gradient and effects */}
        <div className="absolute inset-0 hope-gradient z-0">
          <div className="absolute top-20 left-10 w-96 h-96 bg-pink-500/20 rounded-full filter blur-[100px]"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/30 rounded-full filter blur-[100px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/20 rounded-full filter blur-[80px]"></div>
        </div>
        
        {/* Image with parallax effect */}
        <div className="absolute inset-0 z-0 opacity-60">
          <motion.div 
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            className="w-full h-full relative"
          >
            <Image
              src="/slika.jpg"
              alt="AvioServis Hero"
              fill
              priority
              className="object-cover"
              style={{ objectPosition: "center 30%" }}
              quality={100}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent mix-blend-multiply"></div>
          </motion.div>
        </div>
        
        <div className="relative z-10 max-w-[90%] xl:max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
                Revolucionizirajte Upravljanje Vašom Flotom
              </h1>
              <motion.p 
                className="text-xl md:text-2xl mb-10 text-white/90 font-light"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                Naš intuitivni softver pruža sve alate za efikasno praćenje vozila, servisnih zapisa,
                rokova i generisanje izvještaja – sve na jednom mjestu.
              </motion.p>
              <motion.div 
                className="flex gap-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <Button primary className="min-w-[200px]">Zatražite Demo</Button>
                <Button className="min-w-[200px]">
                  <span className="flex items-center justify-center gap-2">
                    Saznajte Više
                    <motion.svg 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      animate={{ x: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
                    >
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </motion.svg>
                  </span>
                </Button>
              </motion.div>
            </motion.div>
            
            {/* Right content - Floating Card with 3D effect */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden md:block"
            >
              <motion.div 
                className="backdrop-blur-lg bg-white/10 rounded-2xl p-8 border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                initial={{ rotateY: 0, rotateX: 0 }}
                animate={{ 
                  rotateY: [0, 5, 0, -5, 0],
                  rotateX: [0, -5, 0, 5, 0]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 10,
                  ease: "easeInOut"
                }}
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500/30 rounded-lg flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 9H15V3H9V9H5L12 16L19 9ZM4 18H20V20H4V18Z" fill="white"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Aviocisterna</h4>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
                        <span className="text-xs opacity-90">Aktivno</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                </div>
                
                <div className="bg-white/5 p-4 rounded-xl mb-5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm opacity-80">ID Vozila:</span>
                    <span className="font-medium">AVC-8032</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm opacity-80">Tip:</span>
                    <span className="font-medium">Airbus A321 Fuel Truck</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm opacity-80">Kapacitet:</span>
                    <span className="font-medium">36.000 litara</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-80">Registracija vrijedi do:</span>
                    <span className="font-medium text-yellow-300">05.09.2023</span>
                  </div>
                </div>
                
                <div className="mb-5">
                  <h5 className="text-sm font-medium mb-3">Nivo goriva</h5>
                  <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                      initial={{ width: "0%" }}
                      animate={{ width: "75%" }}
                      transition={{ duration: 1, delay: 0.5 }}
                    ></motion.div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs opacity-70">0 L</span>
                    <span className="text-xs font-medium">27.000 L</span>
                    <span className="text-xs opacity-70">36.000 L</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-white/5 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs opacity-80">Posljednji servis</span>
                      <div className="w-6 h-6 rounded-full bg-blue-400/20 flex items-center justify-center">
                        <span className="text-xs">🔧</span>
                      </div>
                    </div>
                    <p className="font-medium">15.04.2023</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs opacity-80">Sljedeća kalibracija</span>
                      <div className="w-6 h-6 rounded-full bg-purple-400/20 flex items-center justify-center">
                        <span className="text-xs">📆</span>
                      </div>
                    </div>
                    <p className="font-medium text-red-300">01.06.2023</p>
                  </div>
                </div>
                
                <h5 className="text-sm font-medium mb-3">Aktivne obaveze</h5>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <span className="text-xs">Kalibracija protokomjera</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <span className="text-xs">Provjera kočnica</span>
                  </div>
                </div>
                
                <div className="flex justify-between gap-2">
                  <button className="h-9 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg text-sm font-medium">Detalji vozila</button>
                  <button className="h-9 px-4 bg-white/10 rounded-lg text-sm">+ Novi servis</button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="flex flex-col items-center">
            <p className="mb-2 text-sm text-white/70">Scroll Down</p>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
          </div>
        </motion.div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-32 px-6 md:px-12 lg:px-24 relative">
        {/* Enhanced background effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/15 rounded-full filter blur-[80px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-blue-500/10 rounded-full filter blur-[80px]"></div>
          <motion.div 
            className="absolute -bottom-40 -left-40 w-80 h-80 border border-white/10 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          />
          <motion.div 
            className="absolute top-20 right-20 w-64 h-64 border border-white/5 rounded-full"
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />
        </div>
        
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
              Izazovi sa kojima se suočavate
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto font-light">
              Prepoznali smo ključne probleme u avioservisnom sektoru i razvili rješenja koja transformišu vaše poslovanje
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
            {/* Connecting lines between cards (visible only on larger screens) */}
            <div className="absolute inset-0 hidden lg:block pointer-events-none z-0">
              <svg width="100%" height="100%" className="absolute inset-0" style={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: '1px', fill: 'none' }}>
                <motion.path 
                  d="M180 120 L300 240 L420 120 L540 240 L660 120 L780 240" 
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                  viewport={{ once: true }}
                />
              </svg>
            </div>

            {[
              {
                title: "Izgubljeni papiri i dokumentacija",
                problem: "Praćenje servisne dokumentacije kroz papire često vodi do gubljenja važnih podataka.",
                solution: "Digitalizacija i centralizacija svih dokumenata sa naprednim pretraživanjem i automatskim backup-om.",
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 13H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 17H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 9H9H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                accentColor: "from-blue-400 to-indigo-500",
                stat: "94%",
                statLabel: "klijenata eliminisalo papirologiju"
              },
              {
                title: "Propušteni rokovi i kalibracije",
                problem: "Propuštanje važnih rokova za registraciju, kalibracije ili tehnički pregled stvara dodatne troškove.",
                solution: "Inteligentni sistem notifikacija koji pravovremeno obavještava o svim kritičnim rokovima.",
                icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 6V12L16 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 4L12 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M16.95 7.05L18.36 5.64" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                accentColor: "from-red-400 to-pink-500",
                stat: "87%",
                statLabel: "manje propuštenih rokova"
              },
              {
                title: "Nekonzistentno praćenje servisa",
                problem: "Neadekvatno praćenje servisnih intervala dovodi do nepotrebnih kvarova i produženog vremena stajanja.",
                solution: "Automatizirano planiranje održavanja bazirano na stvarnom stanju vozila i prediktivnom analitici.",
                icon: <svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.7 6.3C14.5 6.1 14.3 6 14 6H9.9C9.5 6 9 6.2 8.7 6.5L5.8 9.4C5.5 9.7 5.3 10.1 5.3 10.5C5.3 10.9 5.5 11.3 5.8 11.7L8.7 14.6C9.1 14.9 9.5 15.1 9.9 15.1H14C14.4 15.1 14.7 14.9 14.9 14.6L17.8 11.7C18.1 11.3 18.3 10.9 18.3 10.5C18.3 10.1 18.1 9.7 17.8 9.4L14.7 6.3Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 19V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 19H16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                accentColor: "from-amber-400 to-orange-500",
                stat: "63%",
                statLabel: "manje neplaniranih kvarova"
              },
              {
                title: "Kompleksno izvještavanje",
                problem: "Generisanje izvještaja za menadžment ili inspekcije oduzima previše vremena i resursa.",
                solution: "Automatsko generisanje prilagođenih izvještaja sa naprednim grafičkim prikazima i analitikom.",
                icon: <svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 20V10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 20V4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 20V14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 10L18 8L16 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 4L12 2L10 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 14L6 12L4 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                accentColor: "from-emerald-400 to-teal-500",
                stat: "76%",
                statLabel: "ušteda vremena za izvještaje"
              },
              {
                title: "Nedostatak preglednosti",
                problem: "Teško je imati jasnu sliku o stanju cijele flote i predvidjeti buduće potrebe.",
                solution: "Interaktivne kontrolne table sa real-time metrikama i prediktivnom analitikom.",
                icon: <svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 21L16.65 16.65" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M11 8C9.34315 8 8 9.34315 8 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                accentColor: "from-violet-400 to-purple-500",
                stat: "82%",
                statLabel: "bolja vizualizacija flote"
              },
              {
                title: "Neusklađenost sa regulativama",
                problem: "Držanje koraka sa promjenama u regulativama zahtijeva stalno praćenje i dokumentaciju.",
                solution: "Automatsko usklađivanje sa najnovijim regulativama i standradima, uz obavještenja o promjenama.",
                icon: <svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 5H7C6.46957 5 5.96086 5.21071 5.58579 5.58579C5.21071 5.96086 5 6.46957 5 7V19C5 19.5304 5.21071 20.0391 5.58579 20.4142C5.96086 20.7893 6.46957 21 7 21H17C17.5304 21 18.0391 20.7893 18.4142 20.4142C18.7893 20.0391 19 19.5304 19 19V7C19 6.46957 18.7893 5.96086 18.4142 5.58579C18.0391 5.21071 17.5304 5 17 5H15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 5C9 4.46957 9.21071 3.96086 9.58579 3.58579C9.96086 3.21071 10.4696 3 11 3H13C13.5304 3 14.0391 3.21071 14.4142 3.58579C14.7893 3.96086 15 4.46957 15 5V7H9V5Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 14L11 16L15 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                accentColor: "from-cyan-400 to-blue-500",
                stat: "100%",
                statLabel: "usklađenost sa regulativama"
              }
            ].map((item, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative z-10"
              >
                <motion.div 
                  className="rounded-2xl h-full backdrop-blur-lg bg-white/5 overflow-hidden border border-white/10 shadow-lg"
                  whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {/* Top icon section with gradient */}
                  <div className={`p-6 bg-gradient-to-r ${item.accentColor} bg-opacity-20 flex justify-between items-center`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                        {item.icon}
                      </div>
                      <h3 className="text-xl font-bold">{item.title}</h3>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-lg">#{index + 1}</span>
                    </div>
                  </div>
                  
                  {/* Problem section */}
                  <div className="px-6 py-5">
                    <div className="mb-2 text-sm font-medium text-white/60 uppercase tracking-wider">Problem</div>
                    <p className="text-white/90">{item.problem}</p>
                  </div>
                  
                  {/* Solution section */}
                  <div className="px-6 py-5 bg-white/5">
                    <div className="mb-2 text-sm font-medium text-white/60 uppercase tracking-wider">Naše rješenje</div>
                    <p className="text-white/90">{item.solution}</p>
                    
                    {/* Stats section */}
                    <div className="mt-6 py-3 px-4 bg-white/10 rounded-xl flex items-center justify-between">
                      <div className="text-sm text-white/70">{item.statLabel}</div>
                      <div className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${item.accentColor}`}>
                        {item.stat}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
          
          {/* Call to action */}
          <motion.div 
            className="mt-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            viewport={{ once: true }}
          >
            <Button primary className="px-10">
              <span className="flex items-center gap-2">
                Pročitajte studije slučaja
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
              </span>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="py-32 px-6 md:px-12 lg:px-24 bg-black/10 backdrop-blur-sm relative overflow-hidden">
        {/* Enhanced background effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full filter blur-[100px]"></div>
          <div className="absolute top-20 left-20 w-80 h-80 bg-pink-500/10 rounded-full filter blur-[100px]"></div>
          <motion.div 
            className="absolute top-full left-1/3 w-[600px] h-[600px] border border-white/5 rounded-full -mt-[300px]"
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          />
          <motion.div 
            className="absolute -top-40 -right-40 w-80 h-80 border border-white/10 rounded-full"
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          />
        </div>
        
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
              Ključne Funkcionalnosti
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto font-light">
              Naša platforma pruža sve alate potrebne za efikasno upravljanje vašom avioservisnom flotom
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 gap-12">
            {[
              {
                title: "Detaljan pregled vozila",
                description: "Pohranjujte i pristupite svim važnim podacima o vozilu: tehnički podaci, specifikacije opreme, filteri, crijeva, kalibracije i više.",
                benefit: "Potpuna vidljivost nad kompletnim inventarom i stanjem vaših vozila.",
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 3H1V16H16V3Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 8H20L23 11V16H16V8Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="5.5" cy="18.5" r="2.5" stroke="white" strokeWidth="2"/>
                  <circle cx="18.5" cy="18.5" r="2.5" stroke="white" strokeWidth="2"/>
                </svg>,
                color: "from-blue-400 to-indigo-600"
              },
              {
                title: "Upravljanje servisnim zapisima",
                description: "Kreirajte, pratite i pregledavajte kompletnu historiju servisa, dodajite dokumente i fotografije za svaki servis.",
                benefit: "Eliminišite papirologiju i imajte pristup istoriji servisa bilo kada i bilo gdje.",
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 3V7C14 7.26522 14.1054 7.51957 14.2929 7.70711C14.4804 7.89464 14.7348 8 15 8H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M17 21H7C6.46957 21 5.96086 20.7893 5.58579 20.4142C5.21071 20.0391 5 19.5304 5 19V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H14L19 8V19C19 19.5304 18.7893 20.0391 18.4142 20.4142C18.0391 20.7893 17.5304 21 17 21Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 9H10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 13H15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 17H15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                color: "from-emerald-400 to-green-600"
              },
              {
                title: "Automatsko praćenje rokova",
                description: "Pratite sve važne rokove: registracija, ADR, tehnički pregledi, zamjene dijelova i kalibracije uz pravovremene notifikacije.",
                benefit: "Nikad više ne propustite važan rok ili obavezu.",
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 2V6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 2V6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 10H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 14H8.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 14H12.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 14H16.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 18H8.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 18H12.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 18H16.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                color: "from-amber-400 to-orange-600"
              },
              {
                title: "Generisanje izvještaja",
                description: "Jednim klikom kreirajte izvještaje o stanju vozila, servisnoj istoriji, troškovima i izvještaje za inspekcije.",
                benefit: "Uštedite sate administrativnog posla i dobijte uvid u poslovanje na osnovu podataka.",
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 10L12 15L17 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 15V3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                color: "from-red-400 to-pink-600"
              },
              {
                title: "Upravljanje dokumentacijom",
                description: "Organizujte i pohranite sve slike, certifikate i tehničku dokumentaciju na siguran i lako dostupan način.",
                benefit: "Trenutni pristup svim potrebnim dokumentima bez pretrage kroz fascikle.",
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 6H20C20.5304 6 21.0391 6.21071 21.4142 6.58579C21.7893 6.96086 22 7.46957 22 8V19Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 11V17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 14H15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                color: "from-purple-400 to-violet-600"
              },
              {
                title: "Korisničke uloge i pristup",
                description: "Dodijelite različite nivoe pristupa vašem timu na osnovu njihovih potreba i odgovornosti.",
                benefit: "Održavajte sigurnost podataka dok omogućavate efikasnu saradnju među timom.",
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                color: "from-cyan-400 to-blue-600"
              },
            ].map((feature, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <motion.div 
                  className="h-full backdrop-blur-lg bg-white/5 rounded-2xl overflow-hidden border border-white/10"
                  whileHover={{ 
                    y: -10, 
                    boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
                    transition: { type: "spring", stiffness: 400 }
                  }}
                >
                  {/* Header with icon and title */}
                  <div className={`p-6 bg-gradient-to-r ${feature.color} flex items-center justify-between`}>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-black/20 backdrop-blur-sm flex items-center justify-center">
                        {feature.icon}
                      </div>
                      <h3 className="text-2xl font-bold">{feature.title}</h3>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <span>0{index + 1}</span>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div className="p-6">
                    <p className="text-white/80 mb-8 text-lg">{feature.description}</p>
                    
                    <div className="flex items-center justify-between">
                      {/* Benefit */}
                      <div className="bg-black/20 backdrop-blur-md p-4 rounded-xl flex-1">
                        <h4 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-2">Korist</h4>
                        <p className="font-medium">{feature.benefit}</p>
                      </div>
                      
                      {/* Action button */}
                      <motion.button 
                        className="ml-4 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.2)" }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
          
          {/* Interactive demo feature */}
          <motion.div 
            className="mt-20 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-8 overflow-hidden relative"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 rounded-full filter blur-[80px]"></div>
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="max-w-2xl">
                  <h3 className="text-2xl font-bold mb-4">Želite vidjeti platformu u akciji?</h3>
                  <p className="text-white/80 mb-6">
                    Naši konsultanti će vam pokazati kako naša platforma funkcioniše na stvarnim primjerima iz vaše industrije. 
                    Demo sesije su prilagođene vašim specifičnim potrebama i izazovima.
                  </p>
                  <Button primary className="w-full md:w-auto">
                    <span className="flex items-center gap-2">
                      Zakažite personalizovanu demo sesiju
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </span>
                  </Button>
                </div>
                <div className="w-full md:w-auto">
                  <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg w-full md:w-64 h-64 bg-black/30 flex items-center justify-center">
                    <div className="p-4 text-center">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
                        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                        <path d="M10 8L16 12L10 16V8Z" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p className="text-white/90 font-medium">Pogledajte demo video</p>
                      <p className="text-white/60 text-sm mt-2">3:42 min</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-32 px-6 md:px-12 lg:px-24 relative overflow-hidden">
        {/* Enhanced background effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] bg-indigo-500/15 rounded-full filter blur-[100px]"></div>
          <div className="absolute bottom-1/4 left-1/4 w-[350px] h-[350px] bg-cyan-500/10 rounded-full filter blur-[100px]"></div>
          <motion.div 
            className="absolute top-10 left-10 w-72 h-72 border border-white/5 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
          />
          <motion.div 
            className="absolute bottom-20 right-20 w-60 h-60 border border-white/10 rounded-full"
            animate={{ rotate: -360 }}
            transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
          />
          <svg width="100%" height="100%" className="absolute inset-0 opacity-10">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
              Prednosti Našeg Rješenja
            </h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto font-light">
              Naš proizvod ne samo da rješava svakodnevne izazove već i transformiše način upravljanja vašom flotom
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Povećana Efikasnost",
                description: "Automatizacijom rutinskih zadataka i eliminacijom papirologije, vaš tim može se fokusirati na produktivnije aktivnosti.",
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                color: "from-yellow-400 to-orange-500",
                metric: "35%",
                metricLabel: "veća produktivnost tima"
              },
              {
                title: "Smanjeni Operativni Troškovi",
                description: "Prediktivno održavanje i pravovremene intervencije smanjuju troškove popravki i produžuju životni vijek vozila.",
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 1V23" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                color: "from-green-400 to-emerald-500",
                metric: "28%",
                metricLabel: "smanjenje operativnih troškova"
              },
              {
                title: "Poboljšana Usklađenost",
                description: "Osigurajte da je vaša flota uvijek usklađena sa najnovijim regulativama i standardima u industriji.",
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 11L12 14L22 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                color: "from-blue-400 to-indigo-500",
                metric: "100%",
                metricLabel: "usklađenost sa industrijskim standardima"
              },
              {
                title: "Bolje Donošenje Odluka",
                description: "Analizirajte trendove i podatke za informisano donošenje odluka o održavanju, zamjeni ili proširenju flote.",
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 12H18L15 21L9 3L6 12H2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                color: "from-purple-400 to-violet-500",
                metric: "47%",
                metricLabel: "preciznije prognoziranje potreba"
              },
              {
                title: "Manje Administrativnog Posla",
                description: "Automatizovani izvještaji i notifikacije eliminišu potrebu za ručnim praćenjem i generisanjem izvještaja.",
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 4H8C7.44772 4 7 4.44772 7 5V19C7 19.5523 7.44772 20 8 20H16C16.5523 20 17 19.5523 17 19V5C17 4.46957 16.5523 4 16 4Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 17H12.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                color: "from-pink-400 to-rose-500",
                metric: "68%",
                metricLabel: "manje administrativnog rada"
              },
              {
                title: "Poboljšana Sigurnost",
                description: "Redovno održavanje i pravovremene inspekcije osiguravaju da vaša vozila uvijek ispunjavaju sigurnosne standarde.",
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>,
                color: "from-cyan-400 to-teal-500",
                metric: "56%",
                metricLabel: "smanjenje sigurnosnih incidenata"
              }
            ].map((benefit, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="h-full"
              >
                <motion.div 
                  className="h-full backdrop-blur-md bg-white/5 rounded-2xl border border-white/10 overflow-hidden"
                  whileHover={{ y: -8, boxShadow: "0 15px 30px rgba(0,0,0,0.2)" }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className={`h-2 bg-gradient-to-r ${benefit.color}`}></div>
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${benefit.color} flex items-center justify-center shadow-lg`}>
                        {benefit.icon}
                      </div>
                      <div className="bg-black/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                        <span className="text-xs text-white/60 uppercase tracking-wider block">Poboljšanje</span>
                        <span className="text-xl font-bold">{benefit.metric}</span>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{benefit.title}</h3>
                    <p className="text-white/70 mb-6">{benefit.description}</p>
                    
                    <div className="bg-black/20 backdrop-blur-sm p-3 rounded-xl text-sm text-white/60">
                      <div className="flex items-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                          <path d="M22 11.0799V11.9999C21.9988 14.1563 21.3005 16.2545 20.0093 17.9817C18.7182 19.7088 16.9033 20.9723 14.8354 21.5838C12.7674 22.1952 10.5573 22.1218 8.53447 21.3746C6.51168 20.6274 4.78465 19.246 3.61096 17.4369C2.43727 15.6279 1.87979 13.4879 2.02168 11.3362C2.16356 9.18443 2.99721 7.13619 4.39828 5.49694C5.79935 3.85768 7.69279 2.71525 9.79619 2.24001C11.8996 1.76477 14.1003 1.9822 16.07 2.85986" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M22 4L12 14.01L9 11.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{benefit.metricLabel}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
          
          {/* Case Study Highlight */}
          <motion.div 
            className="mt-16 bg-gradient-to-r from-indigo-500/30 to-blue-500/30 backdrop-blur-lg rounded-3xl overflow-hidden border border-white/10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <div className="p-8 md:p-10 grid md:grid-cols-5 gap-8">
              <div className="md:col-span-3">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mr-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 18.0604 3.85588 17.9698C3.95653 17.8792 4.10405 17.8274 4.29 17.8274C4.47575 17.8274 4.61328 17.8792 4.70392 17.9698C4.79456 18.0604 4.84636 18.1979 4.84636 18.375C4.84636 18.5578 4.79456 18.7053 4.70392 18.7959C4.61328 18.8865 4.47575 18.9383 4.29 18.9383Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-sm text-white/60 uppercase tracking-wider">Studija slučaja</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">Kako je AeroMaintenance smanjio operativne troškove za 32%</h3>
                <p className="text-white/70 mb-6">
                  AeroMaintenance, vodeća kompanija u održavanju aviona, uspjela je značajno smanjiti troškove implementacijom našeg sistema.
                  Zahvaljujući prediktivnom održavanju i automatizaciji, optimizovali su procese i izbjegli neplanirane zastoje.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="bg-white/10 py-2 px-4 rounded-lg">
                    <span className="text-sm">32% smanjenje troškova</span>
                  </div>
                  <div className="bg-white/10 py-2 px-4 rounded-lg">
                    <span className="text-sm">45% manje zastoja</span>
                  </div>
                  <div className="bg-white/10 py-2 px-4 rounded-lg">
                    <span className="text-sm">68% brža inspekcija</span>
                  </div>
                </div>
                <Button className="mt-6">
                  <span className="flex items-center gap-2">
                    Pročitajte cijeli slučaj
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </span>
                </Button>
              </div>
              <div className="md:col-span-2 flex items-center justify-center">
                <div className="relative w-full h-64 md:h-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-xl backdrop-blur-sm border border-white/10 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-5xl font-bold mb-2">32%</div>
                      <div className="text-lg">Smanjenje troškova</div>
                      <div className="mt-6 w-3/4 mx-auto h-1 bg-white/20 rounded-full">
                        <motion.div 
                          className="h-1 bg-white rounded-full" 
                          initial={{ width: 0 }}
                          whileInView={{ width: '68%' }}
                          transition={{ duration: 1, delay: 0.5 }}
                          viewport={{ once: true }}
                        />
                      </div>
                      <div className="mt-6 text-sm text-white/60">
                        Rezultat nakon 6 mjeseci korištenja
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section id="testimonials" className="py-20 px-6 md:px-12 lg:px-24 bg-black/10 backdrop-blur-sm relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-500/10 rounded-full filter blur-3xl"></div>
        </div>
        
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              Šta Naši Klijenti Kažu
            </h2>
          </FadeIn>
          
          <div className="flex overflow-x-auto gap-8 pb-8 snap-x">
            {[
              {
                quote: "Ovaj softver je potpuno transformisao način na koji upravljamo našom flotom. Ušteda vremena je nevjerovatna.",
                author: "Mirza H.",
                role: "Direktor Održavanja, AirBalkan",
                avatar: "/testimonial1.jpg"
              },
              {
                quote: "Notifikacije o rokovima su nam spasile hiljade eura u potencijalnim kaznama i zastojima. Neophodan alat za svaki moderni servis.",
                author: "Amra K.",
                role: "Menadžer Flote, SkyMaintenance",
                avatar: "/testimonial2.jpg"
              },
              {
                quote: "Inspekcijski izvještaji koji su prije oduzimali dane sada se generišu u minutama. Nevjerovatna ušteda resursa.",
                author: "Emir S.",
                role: "Tehnički Direktor, AeroServis",
                avatar: "/testimonial3.jpg"
              }
            ].map((testimonial, index) => (
              <FadeIn 
                key={index} 
                delay={index * 0.2}
                className="min-w-[320px] md:min-w-[400px] snap-center"
              >
                <Card className="h-full flex flex-col">
                  <div className="text-5xl text-white/30 mb-4">"</div>
                  <p className="italic mb-6 text-lg flex-grow">{testimonial.quote}</p>
                  <div className="flex items-center gap-4 mt-auto pt-4 border-t border-white/10">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl">
                      {testimonial.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold">{testimonial.author}</p>
                      <p className="opacity-80 text-sm">{testimonial.role}</p>
                    </div>
                  </div>
                </Card>
              </FadeIn>
            ))}
          </div>
          
          <FadeIn delay={0.4}>
            <div className="mt-16 flex flex-wrap justify-center gap-8">
              {[1, 2, 3, 4].map((i) => (
                <motion.div 
                  key={i}
                  className="h-14 w-40 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-md border border-white/10"
                  whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.15)" }}
                >
                  <span className="font-semibold">Logo Klijenta {i}</span>
                </motion.div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Call to Action Section */}
      <section id="contact" className="py-24 px-6 md:px-12 lg:px-24 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-pink-500/20 to-blue-500/20 rounded-full filter blur-3xl"></div>
        </div>
        
        <FadeIn>
          <Card className="p-12 max-w-5xl mx-auto text-center">
            <motion.h2 
              className="text-3xl md:text-4xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              Spremni za transformaciju vašeg servisa?
            </motion.h2>
            <motion.p 
              className="text-xl mb-10 max-w-3xl mx-auto opacity-90"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Pridružite se vodećim avio servisima koji su već unaprijedili svoje poslovanje. 
              Zatražite besplatnu demonstraciju našeg softvera danas.
            </motion.p>
            <motion.div 
              className="flex gap-6 justify-center flex-col sm:flex-row"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <Button primary className="px-10 py-5">Zatražite Besplatan Demo</Button>
              <Button className="px-10 py-5">Kontaktirajte Nas</Button>
            </motion.div>
          </Card>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 bg-black/40 backdrop-blur-md border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-2xl font-bold mb-4">AvioServis</div>
              <p className="opacity-70">Revolucionarno rješenje za upravljanje avioservisnim flotama.</p>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-4">Linkovi</h4>
              <div className="flex flex-col gap-2">
                <a href="#" className="hover:text-white/80 transition-colors">Početna</a>
                <a href="#features" className="hover:text-white/80 transition-colors">Funkcionalnosti</a>
                <a href="#benefits" className="hover:text-white/80 transition-colors">Prednosti</a>
                <a href="#testimonials" className="hover:text-white/80 transition-colors">Klijenti</a>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-4">Kontakt</h4>
              <div className="flex flex-col gap-2 opacity-80">
                <p>Email: info@avioservis.com</p>
                <p>Telefon: +387 33 123 456</p>
                <p>Adresa: Aerodromska bb, Sarajevo</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-4">Pratite nas</h4>
              <div className="flex gap-4">
                {["Facebook", "LinkedIn", "Twitter", "Instagram"].map((social, i) => (
                  <a href="#" key={i} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                    {social.charAt(0)}
                  </a>
                ))}
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="opacity-70">© 2023 AvioServis. Sva prava zadržana.</div>
            <div className="flex gap-6 opacity-70">
              <a href="#" className="hover:text-white transition-colors">Uslovi korištenja</a>
              <a href="#" className="hover:text-white transition-colors">Privatnost</a>
              <a href="#" className="hover:text-white transition-colors">Kolačići</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
