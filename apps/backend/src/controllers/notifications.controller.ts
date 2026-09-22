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
      const data = await notificationService.getNotifications(req.user!);
      sendSuccess(res, data, 200);
    } catch (error) {
      next(error);
    }
  };
  markAllAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await notificationService.markAllAsRead(req.user!);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  };
markAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      await notificationService.markAsRead(req.user!, id!);
      sendSuccess(res, { message: 'Notification marked as read' }, 200);
    } catch (error) {
      next(error);
    }
  };

    }

export const notificationsController = new NotificationsController();
