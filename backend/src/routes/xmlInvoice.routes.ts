import { Router } from 'express';
import { authenticateToken, checkRole } from '../middleware/auth';
import { listDispatches, manualDispatchDay, manualDispatchOperation, listEligibleForDate, manualDispatchRange, prepareDispatchDay, prepareDispatchRange, downloadXmlDispatch } from '../controllers/xmlInvoice.controller';

const router = Router();

router.use(authenticateToken);
router.use(checkRole(['ADMIN', 'KONTROLA']));

router.get('/dispatches', listDispatches);
router.post('/dispatch/day', manualDispatchDay);
router.post('/dispatch/operation/:id', manualDispatchOperation);
router.get('/eligible', listEligibleForDate);
router.post('/dispatch/range', manualDispatchRange);
router.post('/prepare/day', prepareDispatchDay);
router.post('/prepare/range', prepareDispatchRange);
router.get('/dispatch/:id/download', downloadXmlDispatch);

export default router;


