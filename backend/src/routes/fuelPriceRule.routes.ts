import { Router, RequestHandler } from 'express';
import { 
  findFuelPriceRule, 
  createFuelPriceRule, 
  getAllFuelPriceRules,
  updateFuelPriceRule
} from '../controllers/fuelPriceRule.controller';
import { authenticateToken, checkRole } from '../middleware/auth'; 

const router = Router();

// Apply authentication and authorization to all routes
router.use(authenticateToken);
router.use(checkRole(['ADMIN', 'KONTROLA', 'FUEL_OPERATOR']));

// Ruta: GET /api/fuel-price-rules/find?airlineId=X&currency=Y
router.get('/find', findFuelPriceRule as RequestHandler);

// Nova ruta: POST /api/fuel-price-rules
router.post('/', createFuelPriceRule as RequestHandler);

// Nova ruta: GET /api/fuel-price-rules (za dohvaćanje svih pravila)
router.get('/', getAllFuelPriceRules as RequestHandler);

// Nova ruta: PUT /api/fuel-price-rules/:id (za ažuriranje postojećeg pravila)
router.put('/:id', updateFuelPriceRule as RequestHandler);

export default router;
