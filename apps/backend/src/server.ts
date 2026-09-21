import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';

const startServer = async () => {
    try {
        // Verify database connection before accepting traffic
        await connectDatabase();

        const app = createApp();

        const server = app.listen(env.PORT, () => {
            logger.info(
                `🚀 SmartHire Backend running in ${env.NODE_ENV} mode on port ${env.PORT}`
            );
            logger.info(`👉 Health check: http://localhost:${env.PORT}/health`);
            logger.info(`👉 API v1: http://localhost:${env.PORT}/api/v1/health`);
        });

        const gracefulShutdown = async (signal: string) => {
            logger.info(`Received ${signal}, initiating graceful shutdown...`);

            server.close(async (err) => {
                if (err) {
                    logger.error({ err }, 'Error during HTTP server shutdown');
                    process.exit(1);
                }

                await disconnectDatabase();
                logger.info('HTTP server closed successfully. Exiting process.');
                process.exit(0);
            });

            // Force shutdown if connections do not close in time
            setTimeout(() => {
                logger.error('Forceful shutdown triggered after timeout.');
                process.exit(1);
            }, 10000).unref();
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    } catch (err) {
        logger.fatal({ err }, 'Failed to initialize server application');
        process.exit(1);
    }
};

startServer();

process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception encountered');
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled promise rejection encountered');
    process.exit(1);
});
