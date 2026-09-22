import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { AuthUser } from './application.service';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  category: 'APPLICATION' | 'SCREENING' | 'RESUME' | 'SYSTEM' | 'JOB';
  timestamp: string;
  read: boolean;
  link: string;
}

class NotificationService {
    // In-memory set of read notification IDs per user ID
  private userReadNotifications = new Map<string, Set<string>>();

  private getReadSet(userId: string): Set<string> {
    let set = this.userReadNotifications.get(userId);
    if (!set) {
      set = new Set<string>();
      this.userReadNotifications.set(userId, set);
    }
    return set;
  }


    }

export const notificationService = new NotificationService();
