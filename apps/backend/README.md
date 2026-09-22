# SmartHire Backend — Node.js + Express API

Production-ready backend API service for **SmartHire: AI-Assisted Candidate Screening and Resume Skill-Matching Engine**.

The backend serves as the central orchestration layer connecting the Next.js Frontend, PostgreSQL database, file storage, and the Python FastAPI ML Service.

---

## Architecture Overview

```
                          Next.js Frontend
                                │
                                ▼  (HTTP / JSON / JWT)
                      Node.js + Express Backend
                         (Port 4000)
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
  PostgreSQL DB            File Storage          Python FastAPI
 (Prisma ORM 6.4.1)      (Uploads / Disk)          ML Service
   - users                 - UUID-named            (Port 8000)
   - jobs                    resumes             - Document Extraction
   - candidates            - PDF / DOCX          - Text Normalization
   - resumes                                     - Section Parsing
   - applications                                - Skill Matching
   - screening_results                           - Scoring Engine
   - audit_logs                                  - Explainability
```

### Key Architectural Principles
1. **Separation of Concerns**: The Node.js backend manages identity, role authorization, data validation, job lifecycle, candidate talent pipelines, application statuses, file storage, and audit logs.
2. **No Duplication of ML**: All NLP, TF-IDF vectorization, semantic similarity, and parsing algorithms reside exclusively in the Python FastAPI ML service.
3. **Human-in-the-Loop Decision Making**: AI provides transparent, explainable recommendations (`STRONG_MATCH`, `GOOD_MATCH`, `MODERATE_MATCH`, `LOW_MATCH`) with multi-criteria component scores. Autonomous hiring or rejection is strictly forbidden.
4. **Resilience & Security**: Zero-dependency native `fetch` with `AbortSignal.timeout()`, structured Pino logging, correlation request IDs, three-tier rate limiting, dual-layer file validation, and sensitive data sanitization.

---

## Technology Stack

- **Runtime**: Node.js (>= 20 LTS)
- **Language**: TypeScript 5.7 (Strict mode)
- **Framework**: Express.js 4.21
- **Database & ORM**: PostgreSQL with Prisma ORM 6.4.1
- **Authentication**: JWT (Stateless access tokens + refresh tokens), bcryptjs
- **Validation**: Zod 3.24
- **File Upload**: Multer (Disk storage, 10MB limit, UUID naming, MIME & extension type guards)
- **ML Communication**: Native Node.js `fetch` + `FormData` / `Blob` with timeout abort signals
- **Logging**: Pino 9.6 & Pino-HTTP with automatic header/secret redaction
- **Security**: Helmet 8.0, CORS, Express-Rate-Limit 7.5, Crypto Request IDs
- **Testing**: Vitest 5.0 + Supertest (137 integration & API tests, 100% passing)

---

## Directory Structure

```
backend/
├── prisma/
│   ├── schema.prisma              # PostgreSQL schema definitions & relations
│   ├── seed.ts                    # Database seeder (Admin, Recruiters, Jobs, Candidates)
│   └── migrations/                # Prisma database migrations history
├── src/
│   ├── app.ts                     # Express application configuration & middleware stack
│   ├── server.ts                  # HTTP server listener & graceful shutdown handlers
│   ├── config/
│   │   ├── database.ts            # Prisma client singleton & connection lifecycle
│   │   ├── env.ts                 # Zod-validated environment variables
│   │   ├── logger.ts              # Pino logger configuration
│   │   └── upload.ts              # Multer storage, UUID generator, and dual-layer file filters
│   ├── constants/
│   │   ├── errors.ts              # Standard ErrorCodes enum
│   │   ├── roles.ts               # Role definitions (RECRUITER, ADMIN)
│   │   └── statuses.ts            # JobStatus, ApplicationStatus, ResumeProcessingStatus
│   ├── controllers/
│   │   ├── auth.controller.ts     # Register, Login, Refresh, Logout, Profile
│   │   ├── jobs.controller.ts     # CRUD, Publish, Close
│   │   ├── candidates.controller.ts # CRUD, Skills, Experience, Education
│   │   ├── resumes.controller.ts  # Upload, List, Get, Download, Delete
│   │   ├── applications.controller.ts # Create, List, Detail, Status Update, Screen
│   │   ├── ranking.controller.ts  # Leaderboards, Filtering, Sorting, Batch Ranking
│   │   ├── reports.controller.ts  # Overview, Screening Stats, Job Funnel, Talent Pool
│   │   ├── audit.controller.ts    # Security audit trail (Admin only)
│   │   └── health.controller.ts   # Liveness (/health) & Readiness (/health/ready)
│   ├── middleware/
│   │   ├── auth.middleware.ts     # requireAuth, requireRole, optionalAuth
│   │   ├── error.middleware.ts    # Centralized error handler & 404 handler
│   │   ├── rate-limit.middleware.ts # Global (1000/15m), Auth (20/15m), ML (30/5m)
│   │   ├── request-id.middleware.ts # Request correlation UUID generator
│   │   └── validate.middleware.ts # Generic Zod validator (body, params, query)
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   ├── job.repository.ts
│   │   ├── candidate.repository.ts
│   │   ├── resume.repository.ts
│   │   ├── application.repository.ts
│   │   ├── screening.repository.ts
│   │   ├── ranking.repository.ts
│   │   └── report.repository.ts
│   ├── routes/
│   │   ├── index.ts               # API v1 router aggregator
│   │   ├── auth.routes.ts         # /api/v1/auth
│   │   ├── jobs.routes.ts         # /api/v1/jobs
│   │   ├── candidates.routes.ts   # /api/v1/candidates
│   │   ├── resumes.routes.ts      # /api/v1/resumes & /api/v1/candidates/:id/resumes
│   │   ├── applications.routes.ts # /api/v1/applications
│   │   ├── ranking.routes.ts      # /api/v1/ranking
│   │   ├── reports.routes.ts      # /api/v1/reports
│   │   ├── audit.routes.ts        # /api/v1/audit-logs
│   │   └── health.routes.ts       # /api/v1/health
│   ├── schemas/                   # Zod validation schemas for all requests
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── job.service.ts
│   │   ├── candidate.service.ts
│   │   ├── resume.service.ts
│   │   ├── ml.service.ts          # Python FastAPI ML service integration client
│   │   ├── application.service.ts # Lifecycle & screening evaluation
│   │   ├── ranking.service.ts     # Candidate rankings & batch ML triggers
│   │   ├── report.service.ts      # Metrics & analytics aggregation
│   │   └── audit.service.ts       # Security event persistence & logging
│   ├── types/                     # TypeScript interface & contract definitions
│   └── utils/
│       ├── errors.ts              # AppError hierarchy (ValidationError, NotFound, etc.)
│       ├── jwt.ts                 # Access & Refresh token signing/verification
│       ├── pagination.ts          # Pagination metadata helpers
│       ├── password.ts            # bcrypt hashing & comparison
│       └── response.ts            # Standardized API response formatters
├── tests/
│   ├── health/health.test.ts      # Liveness and readiness probe tests (3 tests)
│   ├── auth/auth.test.ts          # Auth, JWT, refresh, RBAC tests (16 tests)
│   ├── jobs/jobs.test.ts          # Job lifecycle, publish, permissions (16 tests)
│   ├── candidates/candidates.test.ts # Candidate profile, skills, education (20 tests)
│   ├── resumes/resumes.test.ts    # Multer upload, download, delete (15 tests)
│   ├── ml/ml.test.ts              # FastAPI ML service client integration (10 tests)
│   ├── applications/applications.test.ts # Application screening lifecycle (21 tests)
│   ├── ranking/ranking.test.ts    # Candidate leaderboards, sorting, filters (11 tests)
│   ├── reports/reports.test.ts    # Analytics, funnels, skill gaps (10 tests)
│   └── security/security.test.ts  # Helmet, CORS, rate limiting, RBAC, audit (15 tests)
├── uploads/resumes/               # Default local directory for resume files
├── package.json
└── tsconfig.json
```

---

## Environment Configuration

Create or update `.env` in `backend/`:

```ini
# Application
NODE_ENV=development
PORT=4000

# PostgreSQL Database (Prisma)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smarthire?schema=public"

# Authentication & JWT
JWT_ACCESS_SECRET="super-secret-access-key-minimum-16-chars-long"
JWT_REFRESH_SECRET="super-secret-refresh-key-minimum-16-chars-long"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Python FastAPI ML Service
ML_SERVICE_URL="http://localhost:8000"
ML_REQUEST_TIMEOUT_MS=30000

# File Storage
UPLOAD_DIR="./uploads"
MAX_RESUME_SIZE_MB=10

# Security & Logging
CORS_ORIGIN="http://localhost:3000"
LOG_LEVEL="info"
```

---

## Database Setup & Migrations

```bash
# 1. Run migrations
npm run db:migrate

# 2. Generate Prisma Client
npm run db:generate

# 3. Seed database with initial Admin, Recruiters, Jobs, and Candidates
npm run db:seed

# Optional: Open visual database editor
npm run db:studio
```

---

## Running the Application

### Development Mode (with hot-reload via `tsx`)
```bash
npm run dev
```

### Production Build & Start
```bash
npm run build
npm start
```

---

## API Endpoints Reference

### 1. Health & Probes
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Service liveness probe |
| `GET` | `/health/ready` | Public | Database readiness probe |
| `GET` | `/api/v1/health` | Public | API v1 health status |

### 2. Authentication (`/api/v1/auth`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public (Rate-limited) | Register user (`RECRUITER` or `ADMIN`) |
| `POST` | `/api/v1/auth/login` | Public (Rate-limited) | Authenticate user & receive JWT tokens |
| `POST` | `/api/v1/auth/refresh` | Public | Exchange refresh token for new access token |
| `POST` | `/api/v1/auth/logout` | Authenticated | Invalidate session |
| `GET` | `/api/v1/auth/me` | Authenticated | Get current authenticated user profile |

### 3. Job Management (`/api/v1/jobs`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/jobs` | Optional Auth | List jobs with status, search, and pagination |
| `POST` | `/api/v1/jobs` | Authenticated | Create a new draft job posting |
| `GET` | `/api/v1/jobs/:id` | Optional Auth | Get job details by ID (drafts restricted to owner) |
| `PATCH` | `/api/v1/jobs/:id` | Owner / Admin | Update job details and requirements |
| `DELETE` | `/api/v1/jobs/:id` | Owner / Admin | Delete job posting |
| `POST` | `/api/v1/jobs/:id/publish` | Owner / Admin | Publish job (requires at least 1 required skill) |
| `POST` | `/api/v1/jobs/:id/close` | Owner / Admin | Close an active job |
| `GET` | `/api/v1/jobs/:id/rankings` | Owner / Admin | Get candidate ranking leaderboard for job |
| `POST` | `/api/v1/jobs/:id/rank` | Owner / Admin | Trigger batch AI screening & ranking for job |

### 4. Candidate Management (`/api/v1/candidates`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/candidates` | Authenticated | List candidates with skill, location, and search filters |
| `POST` | `/api/v1/candidates` | Authenticated | Create a new candidate profile |
| `GET` | `/api/v1/candidates/:id` | Authenticated | Get candidate details with skills, experience, education, resumes |
| `PATCH` | `/api/v1/candidates/:id` | Authenticated | Update candidate personal details |
| `DELETE` | `/api/v1/candidates/:id` | Authenticated | Delete candidate profile |
| `POST` | `/api/v1/candidates/:id/skills` | Authenticated | Add or update candidate skill |
| `DELETE` | `/api/v1/candidates/:id/skills/:skillId` | Authenticated | Remove skill from candidate |
| `POST` | `/api/v1/candidates/:id/experience` | Authenticated | Add work experience entry |
| `DELETE` | `/api/v1/candidates/:id/experience/:expId` | Authenticated | Remove work experience entry |
| `POST` | `/api/v1/candidates/:id/education` | Authenticated | Add education qualification |
| `DELETE` | `/api/v1/candidates/:id/education/:eduId` | Authenticated | Remove education qualification |
| `GET` | `/api/v1/candidates/:id/resumes` | Authenticated | List candidate's uploaded resumes |
| `POST` | `/api/v1/candidates/:id/resumes` | Authenticated | Upload resume file (PDF / DOCX, <= 10MB) |

### 5. Resume Management (`/api/v1/resumes`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/resumes/:id` | Authenticated | Get resume metadata and candidate info |
| `GET` | `/api/v1/resumes/:id/download` | Authenticated | Download resume file (`Content-Disposition: attachment`) |
| `DELETE` | `/api/v1/resumes/:id` | Authenticated | Delete resume record and remove file from disk |

### 6. Application Management (`/api/v1/applications`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/applications` | Authenticated | Submit candidate application for published job |
| `GET` | `/api/v1/applications` | Authenticated | List applications with filters (`jobId`, `candidateId`, `status`) |
| `GET` | `/api/v1/applications/:id` | Authenticated | Get application with candidate, job, and screening history |
| `PATCH` | `/api/v1/applications/:id/status` | Owner / Admin | Update application status (human-in-the-loop decision) |
| `POST` | `/api/v1/applications/:id/screen` | Owner / Admin | Evaluate candidate via ML service, persist scores, set `SCREENED` |
| `GET` | `/api/v1/applications/:id/screening` | Owner / Admin | Get screening evaluation history and explainability report |

### 7. Candidate Ranking (`/api/v1/ranking`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/ranking/jobs/:id` | Owner / Admin | Get ranked candidate leaderboard with multi-criteria scores |
| `POST` | `/api/v1/ranking/jobs/:id` | Owner / Admin | Trigger batch AI screening evaluation & deterministic ranking |

### 8. Reports & Analytics (`/api/v1/reports`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/reports/overview` | Authenticated | Executive dashboard KPIs (jobs, candidates, applications, avg score) |
| `GET` | `/api/v1/reports/screening` | Authenticated | Screening analytics: component averages, recommendations, top skills |
| `GET` | `/api/v1/reports/jobs` | Authenticated | Job performance metrics, status distributions, screening rates |
| `GET` | `/api/v1/reports/jobs/:id` | Owner / Admin | Detailed pipeline funnel and top ranked candidate cards for a job |
| `GET` | `/api/v1/reports/candidates` | Authenticated | Talent pool stats, resume coverage, and top candidate skills |

### 9. Security Audit Logs (`/api/v1/audit-logs`)
| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/audit-logs` | `ADMIN` only | Query historical security audit trail with filtering and pagination |

---

## Testing & Quality Assurance

SmartHire Backend maintains a comprehensive test suite built on Vitest and Supertest:

```bash
# Run all test suites
npm test

# Run a specific test suite
npx vitest run tests/auth/auth.test.ts
npx vitest run tests/ranking/ranking.test.ts
npx vitest run tests/security/security.test.ts

# Run tests in watch mode
npx vitest
```

### Test Suite Coverage Breakdown

| Test Suite | Tests | Scope Verified |
| :--- | :---: | :--- |
| [`tests/health/health.test.ts`](file:///c:/Users/blackhole/Documents/GitHub/smart_hire/backend/tests/health/health.test.ts) | 3 | Liveness, readiness with PostgreSQL ping, and versioned health routes |
| [`tests/auth/auth.test.ts`](file:///c:/Users/blackhole/Documents/GitHub/smart_hire/backend/tests/auth/auth.test.ts) | 16 | Registration, duplicate checks, login, JWT refresh, logout, profile fetch, RBAC |
| [`tests/jobs/jobs.test.ts`](file:///c:/Users/blackhole/Documents/GitHub/smart_hire/backend/tests/jobs/jobs.test.ts) | 16 | Job CRUD, validation, draft privacy, publish rules, closing, ownership protection |
| [`tests/candidates/candidates.test.ts`](file:///c:/Users/blackhole/Documents/GitHub/smart_hire/backend/tests/candidates/candidates.test.ts) | 20 | Candidate profiles, skills, education, experience CRUD, search, pagination |
| [`tests/resumes/resumes.test.ts`](file:///c:/Users/blackhole/Documents/GitHub/smart_hire/backend/tests/resumes/resumes.test.ts) | 15 | PDF upload, file size limits, extension guards, metadata retrieval, stream download, disk cleanup |
| [`tests/ml/ml.test.ts`](file:///c:/Users/blackhole/Documents/GitHub/smart_hire/backend/tests/ml/ml.test.ts) | 10 | FastAPI ML service client, text extraction, resume analysis, job analysis, single screening, batch ranking, timeout/error resilience |
| [`tests/applications/applications.test.ts`](file:///c:/Users/blackhole/Documents/GitHub/smart_hire/backend/tests/applications/applications.test.ts) | 21 | Application lifecycle, published-only rules, duplicate prevention, AI screening execution, persistence, explainability |
| [`tests/ranking/ranking.test.ts`](file:///c:/Users/blackhole/Documents/GitHub/smart_hire/backend/tests/ranking/ranking.test.ts) | 11 | Batch ranking via ML service, deterministic ordering, recommendation filtering, score thresholds, skill matching |
| [`tests/reports/reports.test.ts`](file:///c:/Users/blackhole/Documents/GitHub/smart_hire/backend/tests/reports/reports.test.ts) | 10 | Executive overview KPIs, score distributions, skill gap frequencies, job pipeline funnels, candidate pool analytics |
| [`tests/security/security.test.ts`](file:///c:/Users/blackhole/Documents/GitHub/smart_hire/backend/tests/security/security.test.ts) | 15 | Helmet headers, request IDs, CORS, password hash sanitization, SQLi resistance, RBAC, file upload guardrails, audit logging |
| **Total** | **137** | **100% Passing Across All Modules** |

---

## Production Deployment Guidelines

1. **Environment**: Set `NODE_ENV=production` and configure unique, high-entropy secrets for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
2. **Reverse Proxy**: Deploy behind Nginx, Cloudflare, or AWS ALB with SSL termination. Configure `trust proxy` in Express if running behind multiple proxy tiers.
3. **Database**: Run `npm run db:deploy` in your CI/CD pipeline to apply migrations safely without schema drift.
4. **File Storage**: Ensure persistent volume storage is mounted at `UPLOAD_DIR` or configure cloud object storage (S3 / GCS) in production.
5. **Process Management**: Use PM2, Docker, or Kubernetes with liveness probe at `/health` and readiness probe at `/health/ready`.
