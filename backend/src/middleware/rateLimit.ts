import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import { Request, Response } from 'express';

// Jednostavna in-memory mapa za praćenje broja zahtjeva po korisniku
// U produkciji bi ovo trebalo biti u Redis-u ili drugoj vanjskoj pohrani
const userRequestCounts: Map<string, { count: number, timestamp: number }> = new Map();

// Jednostavna in-memory mapa za praćenje sumnjivih aktivnosti
const suspiciousActivities: Map<string, { count: number, lastActivity: Date, activities: string[] }> = new Map();

/**
 * Vraća broj zahtjeva za korisnika u posljednjih 60 sekundi
 * @param userId ID korisnika
 * @returns Broj zahtjeva u posljednjih 60 sekundi
 */
function getRequestCountForUser(userId: string | undefined): number {
  if (!userId) return 0;
  
  const now = Date.now();
  const userRequests = userRequestCounts.get(userId);
  
  // Ako nema prethodnih zahtjeva ili su stariji od 60 sekundi, resetiraj brojač
  if (!userRequests || (now - userRequests.timestamp > 60 * 1000)) {
    userRequestCounts.set(userId, { count: 1, timestamp: now });
    return 1;
  }
  
  // Povećaj brojač i vrati trenutnu vrijednost
  userRequests.count += 1;
  userRequestCounts.set(userId, { count: userRequests.count, timestamp: now });
  return userRequests.count;
}

/**
 * Prati sumnjive aktivnosti korisnika
 * @param req Express Request objekt
 */
function trackSuspiciousActivity(req: Request): void {
  const userId = (req as any).user?.id;
  if (!userId) return;
  
  const activity = {
    url: req.originalUrl || req.url,
    method: req.method,
    ip: req.ip || 'unknown',
    timestamp: new Date(),
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  const userActivities = suspiciousActivities.get(userId) || { 
    count: 0, 
    lastActivity: new Date(), 
    activities: [] 
  };
  
  userActivities.count += 1;
  userActivities.lastActivity = new Date();
  userActivities.activities.push(JSON.stringify(activity));
  
  // Ograniči broj pohranjenih aktivnosti na 100 po korisniku
  if (userActivities.activities.length > 100) {
    userActivities.activities.shift(); // Ukloni najstariju aktivnost
  }
  
  suspiciousActivities.set(userId, userActivities);
  
  // Ovdje možete dodati kod za slanje obavijesti sigurnosnom timu
  // npr. slanje e-maila, Slack poruke, itd.
  console.warn(`Sumnjiva aktivnost za korisnika ${userId}: ${req.method} ${req.originalUrl || req.url}`);
}

// Create a Redis client if REDIS_URL is provided in environment variables
let redisClient: any;
let store: any;

// Try to connect to Redis if URL is provided, otherwise use memory store
if (process.env.REDIS_URL) {
  try {
    redisClient = createClient({ 
      url: process.env.REDIS_URL 
    });
    
    redisClient.on('error', (err: Error) => {
      console.error('Redis error:', err);
      console.warn('Falling back to memory store for rate limiting');
    });

    // Initialize Redis store for rate limiting
    store = new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    });
    
    // Connect to Redis
    (async () => {
      await redisClient.connect();
      console.log('Connected to Redis for rate limiting');
    })();
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    console.warn('Using memory store for rate limiting');
  }
}

// General API rate limiter - applies to all routes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: store, // Use Redis if available, otherwise memory store
  message: {
    status: 'error',
    message: 'Previše zahtjeva, molimo pokušajte ponovo kasnije.',
  },
});

// Stricter rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  store: store, // Use Redis if available, otherwise memory store
  message: {
    status: 'error',
    message: 'Previše pokušaja prijave, molimo pokušajte ponovo kasnije.',
  },
  // Custom handler to return JSON response
  handler: (req: Request, res: Response) => {
    // Access rate limit info from the response object instead of request
    const resetTime = res.locals.rateLimit?.resetTime || new Date(Date.now() + 15 * 60 * 1000);
    res.status(429).json({
      status: 'error',
      message: 'Previše pokušaja prijave. Vaš račun je privremeno zaključan. Pokušajte ponovo za 15 minuta.',
      remainingTime: Math.ceil((resetTime.getTime() - Date.now()) / 1000 / 60), // remaining minutes
    });
  },
  // Skip function for whitelisted IPs and trusted users
  skip: (req: Request) => {
    // Get whitelist from environment variable
    const whitelist = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
    const ip = req.ip || '';
    
    // Skip rate limiting for whitelisted IPs
    if (whitelist.includes(ip)) {
      return true;
    }
    
    // Skip rate limiting for authenticated admin users
    // This ensures administrators are never rate limited
    if ((req as any).user?.role === 'ADMIN') {
      return true;
    }
    
    return false;
  },
  // Custom key generator - uses IP by default, but can be customized
  keyGenerator: (req: Request) => {
    // For login, you might want to rate limit by username + IP to prevent username enumeration
    // This is a simple example using just IP
    // Ensure we always return a string even if req.ip is undefined
    return req.ip || 'unknown';
  }
});

// More aggressive limiter for failed login attempts
export const loginFailureLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 failed attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  store: store,
  skipSuccessfulRequests: true, // Only count failed attempts
  message: {
    status: 'error',
    message: 'Previše neuspjelih pokušaja prijave. Vaš račun je privremeno zaključan.',
  },
  // Custom key generator to handle undefined IPs
  keyGenerator: (req: Request) => {
    // Ensure we always return a string even if req.ip is undefined
    return req.ip || 'unknown';
  }
});

// Limiter for user management routes (more strict)
export const userManagementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // limit each IP to 30 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  store: store,
  message: {
    status: 'error',
    message: 'Previše zahtjeva za upravljanje korisnicima. Pokušajte kasnije.',
  },
  keyGenerator: (req: Request) => {
    return req.ip || 'unknown';
  }
});

// Limiter for sensitive operations like fuel transfers, financial operations
export const sensitiveOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Povećano na 150 zahtjeva po 15 minuta za podršku većem broju legitimnih operacija
  standardHeaders: true,
  legacyHeaders: false,
  store: store,
  message: {
    status: 'error',
    message: 'Previše zahtjeva za osjetljive operacije. Pokušajte kasnije.',
  },
  // Skip rate limiting for certain users
  skip: (req: Request) => {
    // Skip za whitelistu IP adresa
    const whitelist = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
    const ip = req.ip || '';
    if (whitelist.includes(ip)) {
      return true;
    }
    
    // Skip za administratore i korisnike s ulogom KONTROLA
    // Ovi korisnici nikad neće biti ograničeni rate limitingom
    // Ali dodajemo provjeru abnormalnog ponašanja čak i za privilegirane korisnike
    if ((req as any).user?.role === 'ADMIN' || (req as any).user?.role === 'KONTROLA') {
      // Ako je korisnik administrator, ipak provjeravamo ekstremno ponašanje
      // Ovo je zaštita u slučaju kompromitiranog administratorskog računa
      const requestCount = getRequestCountForUser((req as any).user?.id);
      
      // Ako administrator napravi više od 1000 zahtjeva u minuti, to je vjerovatno zloupotreba
      if (requestCount > 1000) {
        console.warn(`Abnormalno ponašanje detektirano za korisnika ID: ${(req as any).user?.id}, uloga: ${(req as any).user?.role}`);
        // Ovdje možete dodati kod za obavještavanje sigurnosnog tima, logiranje događaja, itd.
        // Za sada samo dopuštamo zahtjev, ali ga bilježimo
        trackSuspiciousActivity(req);
      }
      
      return true;
    }
    
    return false;
  },
  keyGenerator: (req: Request) => {
    // Ako je korisnik autentificiran, koristi njegov ID umjesto IP adrese
    // Ovo omogućava da se limit primjenjuje po korisniku, a ne po IP adresi
    // što je bolje za okruženja gdje više korisnika dijeli istu IP adresu
    return (req as any).user?.id ? `user_${(req as any).user.id}` : (req.ip || 'unknown');
  }
});

// Limiter for reporting and data export endpoints
export const reportingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // Povećano na 200 zahtjeva po satu za podršku masovnom generiranju izvještaja
  standardHeaders: true,
  legacyHeaders: false,
  store: store,
  message: {
    status: 'error',
    message: 'Previše zahtjeva za izvještaje. Pokušajte kasnije.',
  },
  // Skip rate limiting for reporting endpoints for certain users
  skip: (req: Request) => {
    // Skip za whitelistu IP adresa
    const whitelist = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
    const ip = req.ip || '';
    if (whitelist.includes(ip)) {
      return true;
    }
    
    // Skip za administratore, KONTROLA i FUEL_OPERATOR uloge
    // Ovi korisnici nikad neće biti ograničeni rate limitingom za izvještaje
    // Ovo je važno za masovno generiranje izvještaja
    if ((req as any).user?.role === 'ADMIN' || 
        (req as any).user?.role === 'KONTROLA' || 
        (req as any).user?.role === 'FUEL_OPERATOR') {
      
      // Ipak provjeravamo ekstremno ponašanje za izvještaje
      const requestCount = getRequestCountForUser((req as any).user?.id);
      
      // Ako korisnik napravi više od 1000 zahtjeva za izvještaje u minuti, to je vjerovatno zloupotreba
      if (requestCount > 1000) {
        console.warn(`Abnormalno ponašanje za izvještaje detektirano za korisnika ID: ${(req as any).user?.id}, uloga: ${(req as any).user?.role}`);
        trackSuspiciousActivity(req);
      }
      
      return true;
    }
    
    return false;
  },
  keyGenerator: (req: Request) => {
    // Ako je korisnik autentificiran, koristi njegov ID umjesto IP adrese
    // Ovo omogućava da se limit primjenjuje po korisniku, a ne po IP adresi
    // što je važno za masovno generiranje izvještaja
    return (req as any).user?.id ? `user_${(req as any).user.id}` : (req.ip || 'unknown');
  }
});
