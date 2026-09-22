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
 /**
   * Fetch live, role-specific notifications for the authenticated user.
   */
  async getNotifications(user: AuthUser): Promise<{
    notifications: AppNotification[];
    unreadCount: number;
  }> {
    const readSet = this.getReadSet(user.id);
    const notifications: AppNotification[] = [];

    if (user.role === Role.APPLICANT) {
      // Find applicant candidate profile
      const candidate = await prisma.candidate.findUnique({
        where: { userId: user.id },
        include: {
          applications: {
            include: {
              job: { select: { id: true, title: true, status: true } },
              screeningResults: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
            orderBy: { appliedAt: 'desc' },
            take: 10,
          },
          resumes: {
            orderBy: { uploadedAt: 'desc' },
            take: 5,
          },
        },
      });
       if (candidate) {
        // 1. Application submissions & statuses
        for (const app of candidate.applications) {
          const notifId = `app-sub-${app.id}`;
          notifications.push({
            id: notifId,
            title: 'Application Submitted',
            message: `Your application for ${app.job.title} is currently ${app.status.replace(/_/g, ' ')}.`,
            type: 'INFO',
            category: 'APPLICATION',
            timestamp: app.appliedAt.toISOString(),
            read: readSet.has(notifId),
            link: '/applications',
          });
           // 2. Screening results
          const latestScreen = app.screeningResults[0];
          if (latestScreen) {
            const screenNotifId = `app-screen-${latestScreen.id}`;
            notifications.push({
              id: screenNotifId,
              title: 'AI Screening Complete',
              message: `AI evaluation finished for ${app.job.title} with a ${Math.round(latestScreen.overallScore)}% match rating.`,
              type: 'SUCCESS',
              category: 'SCREENING',
              timestamp: latestScreen.createdAt.toISOString(),
              read: readSet.has(screenNotifId),
              link: '/applications',
            });
          }
        }
        // 3. Resumes
        for (const res of candidate.resumes) {
          const resNotifId = `res-${res.id}`;
          notifications.push({
            id: resNotifId,
            title: 'Resume Processed',
            message: `Resume "${res.originalFileName}" status: ${res.processingStatus.toLowerCase()}.`,
            type: res.processingStatus === 'PROCESSED' ? 'SUCCESS' : 'INFO',
            category: 'RESUME',
            timestamp: res.uploadedAt.toISOString(),
            read: readSet.has(resNotifId),
            link: '/settings',
          });
        }
      }

    }

export const notificationService = new NotificationService();
