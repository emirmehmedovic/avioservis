import { Router, RequestHandler } from 'express';
import { 
  findFuelPriceRule, 
  createFuelPriceRule, 
  getAllFuelPriceRules,
  updateFuelPriceRule,
  deleteFuelPriceRule
} from '../controllers/fuelPriceRule.controller';
import { authenticateToken, checkRole } from '../middleware/auth'; 

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Ruta: GET /api/fuel-price-rules/find?airlineId=X&currency=Y
router.get('/find', findFuelPriceRule as RequestHandler);

// Nova ruta: POST /api/fuel-price-rules
router.post('/', checkRole(['ADMIN', 'KONTROLA']), createFuelPriceRule as RequestHandler);

// Nova ruta: GET /api/fuel-price-rules (za dohvaćanje svih pravila)
router.get('/', getAllFuelPriceRules as RequestHandler);

// Nova ruta: PUT /api/fuel-price-rules/:id (za ažuriranje postojećeg pravila)
router.put('/:id', checkRole(['ADMIN', 'KONTROLA']), updateFuelPriceRule as RequestHandler);

// Nova ruta: DELETE /api/fuel-price-rules/:id (za brisanje postojećeg pravila)
router.delete('/:id', checkRole(['ADMIN', 'KONTROLA']), deleteFuelPriceRule as RequestHandler);

export default router;
