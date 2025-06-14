import { Router } from 'express';
import { userManagementLimiter } from '../middleware/rateLimit';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { getAllUsers, getUserById, updateUser, deleteUser, createUser } from '../controllers/user.controller';
import { validateRequest } from '../middleware/validateRequest';
import { createUserSchema, updateUserSchema, userIdSchema } from '../schemas/user.schema';

const router = Router();

// GET /users (ADMIN only)
router.get('/', userManagementLimiter, authenticateToken, requireRole('ADMIN'), getAllUsers);

// POST /users (ADMIN only)
router.post('/', 
  userManagementLimiter,
  authenticateToken, 
  requireRole('ADMIN'), 
  validateRequest(createUserSchema),
  createUser
);

// GET /users/:id (ADMIN only)
router.get('/:id', userManagementLimiter, authenticateToken, requireRole('ADMIN'), validateRequest(userIdSchema), getUserById);

// PUT /users/:id (ADMIN only)
router.put('/:id', userManagementLimiter, authenticateToken, requireRole('ADMIN'), validateRequest(updateUserSchema), updateUser);

// DELETE /users/:id (ADMIN only)
router.delete('/:id', userManagementLimiter, authenticateToken, requireRole('ADMIN'), validateRequest(userIdSchema), deleteUser);

export default router;
