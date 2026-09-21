import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './config/logger';
import { getSwaggerSpec } from './docs/swagger';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { apiRateLimiter } from './middleware/rate-limit.middleware';
import {
    errorMiddleware,
    notFoundMiddleware,
} from './middleware/error.middleware';
import { apiV1Routes } from './routes';
import { getHealth, getReadiness } from './controllers/health.controller';

export const createApp = (): Application => {
    const app: Application = express();

    // Basic security and request parsing
    app.use(helmet());
    app.use(
        cors({
            origin: env.CORS_ORIGIN,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
        })
    );
    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ extended: true, limit: '2mb' }));

    // Attach request ID before logging
    app.use(requestIdMiddleware);

    // Structured HTTP request logging
    app.use(
        pinoHttp({
            logger,
            genReqId: (req) => (req as express.Request).id || 'unknown-req-id',
            customLogLevel: (_req, res, err) => {
                if (res.statusCode >= 500 || err) return 'error';
                if (res.statusCode >= 400) return 'warn';
                return 'info';
            },
            autoLogging: {
                ignore: (req) =>
                    req.url === '/health' ||
                    req.url === '/health/ready' ||
                    req.url === '/api/v1/health',
            },
        })
    );

    // Global API rate limiting
    app.use('/api', apiRateLimiter);

    // Root-level health endpoints for orchestration/monitoring
    app.get('/health', getHealth);
    app.get('/health/ready', getReadiness);

    // Swagger UI — enabled by default, can be toggled via ENABLE_SWAGGER
    if (env.ENABLE_SWAGGER) {
        const swaggerSpec = getSwaggerSpec();
        app.use(
            '/api/v1/docs',
            // Relax helmet CSP for swagger-ui assets
            helmet({
                contentSecurityPolicy: {
                    directives: {
                        defaultSrc: ["'self'"],
                        scriptSrc: ["'self'", "'unsafe-inline'"],
                        styleSrc: ["'self'", "'unsafe-inline'"],
                        imgSrc: ["'self'", 'data:'],
                    },
                },
            }),
            swaggerUi.serve,
            swaggerUi.setup(swaggerSpec, {
                customSiteTitle: 'SmartHire API Docs',
                swaggerOptions: {
                    persistAuthorization: true,
                    displayRequestDuration: true,
                    filter: true,
                    tryItOutEnabled: true,
                },
            })
        );
        logger.info(`📄 Swagger UI available at http://localhost:${env.PORT}/api/v1/docs`);
    }

    // API v1 routes
    app.use('/api/v1', apiV1Routes);

    // Catch-all 404 handler
    app.use(notFoundMiddleware);

    // Centralized error handler
    app.use(errorMiddleware);

    return app;
};
