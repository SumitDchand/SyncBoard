import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../validators/auth.validator';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validateRequest(registerSchema),
  AuthController.register
);

router.post(
  '/login',
  authRateLimiter,
  validateRequest(loginSchema),
  AuthController.login
);

router.post(
  '/refresh',
  validateRequest(refreshTokenSchema),
  AuthController.refresh
);

router.post('/logout', AuthController.logout);

router.get('/me', authenticate, AuthController.getMe);

export default router;

