import { Request, Response, NextFunction } from 'express';
import { authService, AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { RegisterInput, LoginInput, RefreshTokenInput } from '../schemas/auth.schema';

export class AuthController {
  constructor(private service: AuthService = authService) {}

  register = async (
    req: Request<unknown, unknown, RegisterInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.service.register(req.body);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request<unknown, unknown, LoginInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.service.login(req.body);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (
    req: Request<unknown, unknown, RefreshTokenInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.service.refreshToken(req.body.refreshToken);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  logout = async (
    _req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    // Client-side JWT invalidation acknowledgement
    sendSuccess(res, { message: 'Logged out successfully' }, 200);
  };

  getMe = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.id;
      const user = await this.service.getCurrentUser(userId);
      sendSuccess(res, { user }, 200);
    } catch (error) {
      next(error);
    }
  };

  getSessions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userAgent = req.headers['user-agent'] || 'Unknown Browser';
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      sendSuccess(
        res,
        {
          sessions: [
            {
              id: 'current',
              userAgent,
              ip,
              lastActive: 'Active now',
              current: true,
            },
          ],
        },
        200
      );
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
