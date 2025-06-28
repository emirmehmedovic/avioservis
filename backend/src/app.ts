import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import {
  apiLimiter,
  authLimiter,
  userManagementLimiter,
  sensitiveOperationsLimiter,
  reportingLimiter,
} from './middleware/rateLimit';
import { initAllCronJobs } from './cron';

import authRoutes from './routes/auth';
import companyRoutes from './routes/company';
import locationRoutes from './routes/location';
import vehicleRoutes from './routes/vehicle';
import usersRoutes from './routes/users';
import profileRoutes from './routes/profile';
import serviceRecordRoutes from './routes/serviceRecords';
import fuelRoutes from './routes/fuelRoutes';
import fixedStorageTankRoutes from './routes/fixedStorageTank.routes';
import fuelIntakeRecordRoutes from './routes/fuelIntakeRecord.routes';
import { fuelIntakeRecordDocumentsRoutes, fuelDocumentRoutes } from './routes/fuelIntakeDocument.routes';
import fixedTankTransferRoutes from './routes/fixedTankTransfer.routes';
import fuelingOperationRoutes from './routes/fuelingOperation.routes';
import fuelReceiptRoutes from './routes/fuelReceipt.routes';
import fuelTransferToTankerRoutes from './routes/fuelTransferToTanker.routes'; // Nove rute
import fuelDrainRoutes from './routes/fuelDrain.routes'; // Rute za istakanje goriva
import airlineRoutes from './routes/airline.routes'; // Import airline routes
import technicalDocumentRoutes from './routes/technicalDocument.routes'; // Import technical document routes
import documentsRouter from './routes/documents'; // Import new secure documents router
import activityRoutes from './routes/activity.routes';
import fuelPriceRuleRoutes from './routes/fuelPriceRule.routes'; // Dodane rute za pravila o cijenama goriva
import fuelProjectionPresetRoutes from './routes/fuelProjectionPreset.routes'; // Rute za spremanje projekcija goriva
import valveTestRoutes from './routes/valveTest.routes'; // Rute za ILPCV i HECPV testove ventila
import fuelOperationLogRoutes from './routes/fuelOperationLog.routes'; // Rute za praćenje operacija s gorivom
import fuelConsistencyRoutes from './routes/fuelConsistency.routes'; // Rute za upravljanje nekonzistentnostima goriva
import reserveFuelRoutes from './routes/reserveFuel.routes'; // Rute za upravljanje rezervnim gorivom
import fuelExcessRoutes from './routes/fuelExcess.routes'; // Rute za ručnu obradu viška goriva
import financialReportsRoutes from './routes/financialReports.routes'; // Rute za finansijske izvještaje
import rezervoarRoutes from './routes/rezervoar.routes'; // Rute za rezervoare
import planKalibracijeRoutes from './routes/planKalibracije.routes'; // Rute za plan kalibracije
import ostalaOpremaRoutes from './routes/ostalaOprema.routes'; // Rute za ostalu opremu

const app = express();

// Trust the first proxy in front of the app (e.g., Nginx, Load Balancer)
// This is important for express-rate-limit to correctly identify client IPs
app.set('trust proxy', 1);

const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'https://dataavioservis.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Apply global API rate limiter to all routes
// Privremeno isključen rate limiting za testiranje i seed skriptu
app.use(apiLimiter);

// Služenje statičkih fajlova iz 'public' direktorijuma
// Npr. fajl public/uploads/vehicles/slika.jpg će biti dostupan na /uploads/vehicles/slika.jpg
app.use(express.static(path.join(__dirname, '../public')));

// Služenje statičkih fajlova iz 'uploads' direktorijuma (u korijenu projekta)
// Npr. fajl uploads/fuel_receipts/dokument.pdf će biti dostupan na /uploads/fuel_receipts/dokument.pdf
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/users', userManagementLimiter, usersRoutes);
app.use('/api/profile', profileRoutes); // Register profile routes
app.use('/api', serviceRecordRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/fuel/fixed-tanks', fixedStorageTankRoutes);
// Mount document routes nested under intakes. 
// The `fuelIntakeRecordDocumentsRoutes` router uses `mergeParams: true` 
// and expects the parent parameter to be named `recordId` for its controllers.
fuelIntakeRecordRoutes.use('/:recordId/documents', fuelIntakeRecordDocumentsRoutes);
app.use('/api/fuel/intakes', reportingLimiter, fuelIntakeRecordRoutes);
app.use('/api/fuel/documents', fuelDocumentRoutes);
app.use('/api/fuel/transfers', sensitiveOperationsLimiter, fixedTankTransferRoutes);
app.use('/api/fuel/fueling-operations', sensitiveOperationsLimiter, fuelingOperationRoutes);
app.use('/api/fuel-receipts', reportingLimiter, fuelReceiptRoutes);
app.use('/api/fuel-transfers-to-tanker', sensitiveOperationsLimiter, fuelTransferToTankerRoutes); // Registracija novih ruta
app.use('/api/fuel/drains', sensitiveOperationsLimiter, fuelDrainRoutes); // Registracija ruta za istakanje goriva
app.use('/api/fuel-operation-logs', sensitiveOperationsLimiter, fuelOperationLogRoutes); // Registracija ruta za audit logove operacija s gorivom
app.use('/api/fuel-consistency', sensitiveOperationsLimiter, fuelConsistencyRoutes); // Registracija ruta za upravljanje nekonzistentnostima u podacima o gorivu
app.use('/api/reserve-fuel', sensitiveOperationsLimiter, reserveFuelRoutes); // Registracija ruta za upravljanje rezervnim gorivom
app.use('/api/fuel', sensitiveOperationsLimiter, fuelExcessRoutes); // Registracija ruta za ručnu obradu viška goriva
app.use('/api/airlines', airlineRoutes); // Mount airline routes
app.use('/api/technical-documents', technicalDocumentRoutes); // Mount technical document routes
app.use('/api/documents', documentsRouter); // Mount new secure documents router
app.use('/api/activities', activityRoutes);
app.use('/api/fuel-price-rules', fuelPriceRuleRoutes); // Registracija ruta za pravila o cijenama goriva
app.use('/api/fuel-projection-presets', fuelProjectionPresetRoutes);
app.use('/api/reports/financial', reportingLimiter, financialReportsRoutes); // Registracija ruta za finansijske izvještaje
app.use('/api/valve-tests', valveTestRoutes); // Registracija ruta za ILPCV i HECPV testove ventila
app.use('/api/rezervoari', rezervoarRoutes); // Registracija ruta za rezervoare
app.use('/api/plan-kalibracije', planKalibracijeRoutes); // Registracija ruta za plan kalibracije
app.use('/api/ostala-oprema', ostalaOpremaRoutes); // Registracija ruta za ostalu opremu

app.get('/', (req, res) => {
  res.send('Backend radi!');
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global Error Handler caught an error:', err.stack || err); // Log the full error stack

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    // Include stack trace in development for easier debugging
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Inicijalizacija cron poslova nakon što se server uspješno pokrene
  try {
    initAllCronJobs();
    console.log('Cron poslovi za periodičnu sinhronizaciju goriva uspješno inicijalzirani.');
  } catch (error) {
    console.error('Greška prilikom inicijalizacije cron poslova:', error);
  }
});
