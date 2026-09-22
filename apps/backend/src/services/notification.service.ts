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