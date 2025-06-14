import { Router, RequestHandler } from 'express'; // Dodaj RequestHandler
import { 
  findFuelPriceRule, 
  createFuelPriceRule, 
  getAllFuelPriceRules,
  updateFuelPriceRule // Import updateFuelPriceRule
} from '../controllers/fuelPriceRule.controller'; // Import getAllFuelPriceRules
// Ovdje možete dodati middleware za autentifikaciju/autorizaciju ako je potrebno
// import { protect, authorize } from '../middleware/auth'; 

const router = Router();

// Ruta: GET /api/fuel-price-rules/find?airlineId=X&currency=Y
// Ako imate 'protect' middleware: router.get('/find', protect, findFuelPriceRule);
router.get('/find', findFuelPriceRule as RequestHandler);

// Nova ruta: POST /api/fuel-price-rules
router.post('/', createFuelPriceRule as RequestHandler);

// Nova ruta: GET /api/fuel-price-rules (za dohvaćanje svih pravila)
router.get('/', getAllFuelPriceRules as RequestHandler);

// Nova ruta: PUT /api/fuel-price-rules/:id (za ažuriranje postojećeg pravila)
router.put('/:id', updateFuelPriceRule as RequestHandler);

export default router;
