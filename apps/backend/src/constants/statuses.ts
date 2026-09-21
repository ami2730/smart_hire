export const JobStatuses = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type JobStatus = (typeof JobStatuses)[keyof typeof JobStatuses];

export const ResumeProcessingStatuses = {
  UPLOADED: 'UPLOADED',
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
} as const;

export type ResumeProcessingStatus =
  (typeof ResumeProcessingStatuses)[keyof typeof ResumeProcessingStatuses];

export const ApplicationStatuses = {
  // Canonical application lifecycle
  SUBMITTED: 'SUBMITTED',
  SCREENING: 'SCREENING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  SHORTLISTED: 'SHORTLISTED',
  INTERVIEW: 'INTERVIEW',
  OFFERED: 'OFFERED',
  HIRED: 'HIRED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',

  // Backwards compatibility aliases
  APPLIED: 'APPLIED',
  PROCESSING: 'PROCESSING',
  SCREENED: 'SCREENED',
  REVIEWED: 'REVIEWED',
} as const;

export type ApplicationStatus =
  (typeof ApplicationStatuses)[keyof typeof ApplicationStatuses];

export const ScreeningRecommendations = {
  STRONG_MATCH: 'STRONG_MATCH',
  GOOD_MATCH: 'GOOD_MATCH',
  MODERATE_MATCH: 'MODERATE_MATCH',
  LOW_MATCH: 'LOW_MATCH',
} as const;

export type ScreeningRecommendation =
  (typeof ScreeningRecommendations)[keyof typeof ScreeningRecommendations];
