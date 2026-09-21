export const Roles = {
  RECRUITER: 'RECRUITER',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];
