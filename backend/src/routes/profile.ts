import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { updateUserPassword } from '../controllers/profile.controller';
import { validateRequest } from '../middleware/validateRequest';
import { updatePasswordSchema } from '../schemas/profile.schema';

const router = Router();

// PUT /profile/password - Update current user's password
router.put('/password', 
  authenticateToken,
  validateRequest(updatePasswordSchema),
  updateUserPassword
);

export default router;
