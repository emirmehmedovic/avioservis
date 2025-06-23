import { Router } from 'express';
import * as fuelExcessController from '../controllers/fuelExcess.controller';
import { authenticateToken, checkRole } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/fuel/excess:
 *   post:
 *     summary: Ručna obrada viška goriva
 *     description: Omogućuje operaterima registraciju korištenja viška litara koji nisu povezani s MRN brojem
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobileTankId
 *               - litersQuantity
 *             properties:
 *               mobileTankId:
 *                 type: integer
 *                 description: ID mobilnog tanka
 *               litersQuantity:
 *                 type: number
 *                 description: Količina litara za obradu
 *               notes:
 *                 type: string
 *                 description: Bilješke o obradi (neobavezno)
 *     responses:
 *       200:
 *         description: Višak goriva uspješno obrađen
 *       400:
 *         description: Netočni parametri
 *       404:
 *         description: Tank nije pronađen
 *       500:
 *         description: Greška na serveru
 */
router.post('/excess', 
  authenticateToken, 
  checkRole(['ADMIN', 'KONTROLA', 'FUEL_OPERATOR']),
  fuelExcessController.processExcessFuel
);

/**
 * @swagger
 * /api/fuel/excess/history:
 *   get:
 *     summary: Povijest ručne obrade viška goriva
 *     description: Dohvaća povijest ručno obrađenog viška goriva
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Popis zapisa o obradi viška goriva
 *       500:
 *         description: Greška na serveru
 */
router.get('/excess/history', 
  authenticateToken, 
  checkRole(['ADMIN', 'KONTROLA', 'FUEL_OPERATOR']),
  fuelExcessController.getExcessFuelHistory
);

export default router;
