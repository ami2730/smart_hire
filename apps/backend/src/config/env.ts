import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file from the backend root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  ML_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  ML_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_RESUME_SIZE_MB: z.coerce.number().int().positive().default(10),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  ENABLE_SWAGGER: z
    .preprocess(
      (val) => (val === undefined ? true : val === 'true' || val === true),
      z.boolean()
    )
    .default(true),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
