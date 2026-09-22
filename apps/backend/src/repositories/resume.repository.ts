import { prisma } from '../config/database';
import { ResumeProcessingStatus, Prisma } from '@prisma/client';
import { ResumeQueryInput } from '../schemas/resume.schema';

// ── Repository ────────────────────────────────────────────────────────────────

class ResumeRepository {
  // ── Find ───────────────────────────────────────────────────────────────────

  async findById(id: string) {
    return prisma.resume.findUnique({
      where: { id },
      include: {
        candidate: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findByCandidateId(candidateId: string, query: ResumeQueryInput) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ResumeWhereInput = {
      candidateId,
      ...(status ? { processingStatus: status as ResumeProcessingStatus } : {}),
    };

    const [resumes, total] = await prisma.$transaction([
      prisma.resume.findMany({
        where,
        skip,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
        include: {
          candidate: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.resume.count({ where }),
    ]);

    return { resumes, total };
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(data: {
    candidateId: string;
    originalFileName: string;
    storedFileName: string;
    filePath: string;
    mimeType: string;
    fileSize: number;
  }) {
    return prisma.resume.create({
      data: {
        ...data,
        processingStatus: ResumeProcessingStatus.UPLOADED,
      },
      include: {
        candidate: { select: { id: true, name: true, email: true } },
      },
    });
  }

  // ── Status updates ─────────────────────────────────────────────────────────

  async updateStatus(
    id: string,
    status: ResumeProcessingStatus,
    extractedText?: string
  ) {
    return prisma.resume.update({
      where: { id },
      data: {
        processingStatus: status,
        ...(extractedText !== undefined ? { extractedText } : {}),
        ...(status === ResumeProcessingStatus.PROCESSED ||
        status === ResumeProcessingStatus.FAILED
          ? { processedAt: new Date() }
          : {}),
      },
    });
  }

  async updateExtractedText(id: string, extractedText: string) {
    return prisma.resume.update({
      where: { id },
      data: {
        extractedText,
        processingStatus: ResumeProcessingStatus.PROCESSED,
        processedAt: new Date(),
      },
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async delete(id: string) {
    return prisma.resume.delete({ where: { id } });
  }
}

export const resumeRepository = new ResumeRepository();
