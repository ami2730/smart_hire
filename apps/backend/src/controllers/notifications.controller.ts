import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/response';

export class NotificationsController {
    getNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      
    } catch (error) {
      next(error);
    }
  };

    }

export const notificationsController = new NotificationsController();
