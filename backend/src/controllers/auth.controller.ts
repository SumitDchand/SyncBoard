import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { env } from '../config/env';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const REFRESH_COOKIE_NAME = 'syncboard_refresh';

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  domain: env.COOKIE_DOMAIN || undefined,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;
      const result = await AuthService.register(name, email, password);

      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);

      sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        'User registered successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);

      sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        'Login successful'
      );
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      const result = await AuthService.refreshToken(refreshToken);

      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);

      sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        'Token refreshed successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      await AuthService.logout(refreshToken);

      res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);

      sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await AuthService.getMe(req.user!._id.toString());
      sendSuccess(res, profile, 'User profile retrieved');
    } catch (error) {
      next(error);
    }
  }
}

