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
     } else if (user.role === Role.RECRUITER) {
      // 1. Recent applications
      const recentApps = await prisma.application.findMany({
        where: {
          job: { recruiterId: user.id },
        },
        include: {
          candidate: { select: { id: true, name: true } },
          job: { select: { id: true, title: true } },
        },
        orderBy: { appliedAt: 'desc' },
        take: 15,
      });
       // If recruiter has no owned jobs yet, also pull global recent applications
      const appsToUse =
        recentApps.length > 0
          ? recentApps
          : await prisma.application.findMany({
              include: {
                candidate: { select: { id: true, name: true } },
                job: { select: { id: true, title: true } },
              },
              orderBy: { appliedAt: 'desc' },
              take: 10,
            });

            for (const app of appsToUse) {
        const notifId = `rec-app-${app.id}`;
        notifications.push({
          id: notifId,
          title: 'New Candidate Application',
          message: `${app.candidate.name} applied for "${app.job.title}".`,
          type: 'INFO',
          category: 'APPLICATION',
          timestamp: app.appliedAt.toISOString(),
          read: readSet.has(notifId),
          link: `/applications/${app.id}`,
        });
      }
      // 2. Recent screening evaluations
      const recentScreenings = await prisma.screeningResult.findMany({
        include: {
          application: {
            include: {
              candidate: { select: { id: true, name: true } },
              job: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      for (const scr of recentScreenings) {
        const notifId = `rec-scr-${scr.id}`;
        notifications.push({
          id: notifId,
          title: 'AI Screening Processed',
          message: `${scr.application.candidate.name} screened for "${scr.application.job.title}" (${Math.round(scr.overallScore)}% · ${scr.recommendation.replace(/_/g, ' ')}).`,
          type: scr.overallScore >= 80 ? 'SUCCESS' : 'INFO',
          category: 'SCREENING',
          timestamp: scr.createdAt.toISOString(),
          read: readSet.has(notifId),
          link: `/applications/${scr.applicationId}/screening`,
        });
      }
       // 3. Recent candidate uploads
      const recentResumes = await prisma.resume.findMany({
        include: {
          candidate: { select: { id: true, name: true } },
        },
        orderBy: { uploadedAt: 'desc' },
        take: 5,
      });

      for (const res of recentResumes) {
        const notifId = `rec-res-${res.id}`;
        notifications.push({
          id: notifId,
          title: 'Resume Parsed',
          message: `Updated resume uploaded for candidate ${res.candidate.name} (${res.originalFileName}).`,
          type: 'INFO',
          category: 'RESUME',
          timestamp: res.uploadedAt.toISOString(),
          read: readSet.has(notifId),
          link: `/candidates/${res.candidateId}`,
        });
      }
    } else if (user.role === Role.ADMIN) {
      // 1. Audit logs
      const auditLogs = await prisma.auditLog.findMany({
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { timestamp: 'desc' },
        take: 15,
      });
      for (const log of auditLogs) {
        const notifId = `admin-audit-${log.id}`;
        notifications.push({
          id: notifId,
          title: `Audit: ${log.action.replace(/_/g, ' ')}`,
          message: `${log.user?.name || 'System'} executed ${log.action} on ${log.resource}.`,
          type: log.action.includes('DELETE') ? 'WARNING' : 'INFO',
          category: 'SYSTEM',
          timestamp: log.timestamp.toISOString(),
          read: readSet.has(notifId),
          link: '/settings',
        });
      }
       // 2. Recent job postings
      const recentJobs = await prisma.job.findMany({
        include: {
          recruiter: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
 for (const job of recentJobs) {
        const notifId = `admin-job-${job.id}`;
        notifications.push({
          id: notifId,
          title: 'Job Position Created',
          message: `"${job.title}" created by ${job.recruiter?.name || 'Recruiter'}.`,
          type: 'INFO',
          category: 'JOB',
          timestamp: job.createdAt.toISOString(),
          read: readSet.has(notifId),
          link: `/jobs/${job.id}`,
        });
      }
    }
// Sort descending by timestamp
    notifications.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const unreadCount = notifications.filter((n) => !n.read).length;

    return {
      notifications,
      unreadCount,
    };
  }
/**
   * Mark all notifications as read for the user.
   */
  async markAllAsRead(user: AuthUser): Promise<{ markedCount: number }> {
    const { notifications } = await this.getNotifications(user);
    const readSet = this.getReadSet(user.id);
    for (const notif of notifications) {
      readSet.add(notif.id);
    }
    return { markedCount: notifications.length };
  }
/**
   * Mark a single notification as read.
   */
  async markAsRead(user: AuthUser, notificationId: string): Promise<void> {
    const readSet = this.getReadSet(user.id);
    readSet.add(notificationId);
  }
    }

export const notificationService = new NotificationService();
