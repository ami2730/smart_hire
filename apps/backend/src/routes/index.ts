import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { jobsRoutes } from './jobs.routes';
import { candidatesRoutes } from './candidates.routes';
import { resumesRoutes } from './resumes.routes';
import { applicationsRoutes } from './applications.routes';
import { rankingRoutes } from './ranking.routes';
import { reportsRoutes } from './reports.routes';
import { auditRoutes } from './audit.routes';
import { notificationsRoutes } from './notifications.routes';
import { applicantRoutes } from './applicant.routes';
import { recruiterRoutes } from './recruiter.routes';
import { adminRoutes } from './admin.routes';

const router = Router();

// Mount API v1 routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Notifications
router.use('/notifications', notificationsRoutes);

// Role-oriented portals
router.use('/applicant', applicantRoutes);
router.use('/recruiter', recruiterRoutes);
router.use('/admin', adminRoutes);

// General & legacy endpoints (preserved for full backwards compatibility)
router.use('/jobs', jobsRoutes);
router.use('/candidates', candidatesRoutes);

// Resume routes mount at root because they span two path shapes:
//   /candidates/:candidateId/resumes  (upload/list)
//   /resumes/:id                      (get/download/delete)
router.use('/', resumesRoutes);

// Application and screening routes
router.use('/applications', applicationsRoutes);

// Candidate ranking routes
router.use('/ranking', rankingRoutes);

// Reports and analytics routes
router.use('/reports', reportsRoutes);

// Security audit log routes (Admin only)
router.use('/audit-logs', auditRoutes);

export const apiV1Routes = router;

