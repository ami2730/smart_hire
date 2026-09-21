-- AlterTable
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "responsibilities" TEXT,
ADD COLUMN IF NOT EXISTS "location" TEXT,
ADD COLUMN IF NOT EXISTS "employmentType" TEXT,
ADD COLUMN IF NOT EXISTS "experienceRequirement" TEXT,
ADD COLUMN IF NOT EXISTS "educationRequirement" TEXT,
ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deadline" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "job_requirements" ADD COLUMN IF NOT EXISTS "preferredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "resumes" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "normalizedName" TEXT,
ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'SYSTEM';

-- AlterTable
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "coverLetter" TEXT,
ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'REGISTERED',
ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';

-- AlterTable
ALTER TABLE "screening_results" ADD COLUMN IF NOT EXISTS "evidence" JSONB,
ADD COLUMN IF NOT EXISTS "status" TEXT,
ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "job_skills" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "candidates_userId_key" ON "candidates"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "candidates_userId_idx" ON "candidates"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "jobs_publishedAt_idx" ON "jobs"("publishedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "resumes_candidateId_isDefault_idx" ON "resumes"("candidateId", "isDefault");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "skills_normalizedName_idx" ON "skills"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "job_skills_jobId_skillId_key" ON "job_skills"("jobId", "skillId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "job_skills_jobId_idx" ON "job_skills"("jobId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "job_skills_skillId_idx" ON "job_skills"("skillId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'candidates_userId_fkey'
    ) THEN
        ALTER TABLE "candidates" ADD CONSTRAINT "candidates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'job_skills_jobId_fkey'
    ) THEN
        ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'job_skills_skillId_fkey'
    ) THEN
        ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
