import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { register, login, getMe } from '../controllers/auth.controller';
import { authLimiter, loginFailureLimiter } from '../middleware/rateLimit';
import { validateRequest } from '../middleware/validateRequest';
import { loginSchema, registerSchema } from '../schemas/auth.schema';

const router = Router();

// Register (samo ADMIN može registrovati nove korisnike)
router.post(
  '/register',
  authLimiter,
  authenticateToken,
  requireRole('ADMIN'),
  validateRequest(registerSchema),
  register
);

// Login
router.post('/login', authLimiter, loginFailureLimiter, validateRequest(loginSchema), login);

// Get current user (auth required)
router.get('/me', authenticateToken, getMe);

export default router;
