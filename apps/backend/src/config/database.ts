import { PrismaClient } from '@prisma/client';
import { logger } from './logger';
import { env } from './env';

const createPrismaClient = () => {
  return new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : [{ emit: 'event', level: 'error' }],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// Attach event listeners for structured query logging in development
if (env.NODE_ENV === 'development') {
  // @ts-expect-error - prisma event typing
  prisma.$on('query', (e: { query: string; params: string; duration: number }) => {
    logger.debug(
      {
        query: e.query,
        params: e.params,
        durationMs: e.duration,
      },
      'Prisma query executed'
    );
  });
}

// @ts-expect-error - prisma event typing
prisma.$on('error', (e: { message: string; target?: string }) => {
  logger.error({ err: e }, 'Prisma error encountered');
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database successfully.');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to PostgreSQL database.');
    throw err;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('Disconnected from PostgreSQL database.');
  } catch (err) {
    logger.error({ err }, 'Error disconnecting from PostgreSQL database.');
  }
};
