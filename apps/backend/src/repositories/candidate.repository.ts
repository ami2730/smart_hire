import { prisma } from '../config/database';
import { CreateCandidateInput, UpdateCandidateInput, CandidateQueryInput } from '../schemas/candidate.schema';
import { Prisma } from '@prisma/client';

// ── Full candidate with nested relations ─────────────────────────────────────

export const candidateWithRelations = {
  skills: {
    include: { skill: true },
    orderBy: { skill: { name: 'asc' as const } },
  },
  education: { orderBy: { startDate: 'desc' as const } },
  experience: { orderBy: { startDate: 'desc' as const } },
  resumes: {
    select: {
      id: true,
      originalFileName: true,
      mimeType: true,
      fileSize: true,
      extractedText: true,
      filePath: true,
      processingStatus: true,
      isDefault: true,
      uploadedAt: true,
    },
    orderBy: [{ isDefault: 'desc' as const }, { uploadedAt: 'desc' as const }],
  },
  _count: {
    select: { applications: true },
  },
  applications: {
    orderBy: { appliedAt: 'desc' as const },
    include: {
      screeningResults: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
      },
    },
  },
} satisfies Prisma.CandidateInclude;

export type CandidateWithRelations = Prisma.CandidateGetPayload<{
  include: typeof candidateWithRelations;
}>;

// ── Repository ────────────────────────────────────────────────────────────────

class CandidateRepository {
  // ── Find/Query ─────────────────────────────────────────────────────────────

  async findById(id: string): Promise<CandidateWithRelations | null> {
    return prisma.candidate.findUnique({
      where: { id },
      include: candidateWithRelations,
    });
  }

  async findByEmail(email: string) {
    return prisma.candidate.findUnique({ where: { email } });
  }

  async findAll(query: CandidateQueryInput): Promise<{
    candidates: CandidateWithRelations[];
    total: number;
  }> {
    const { page, limit, search, skills, location, status, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CandidateWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    if (skills) {
      const skillList = skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (skillList.length > 0) {
        where.skills = {
          some: {
            skill: {
              name: { in: skillList, mode: 'insensitive' },
            },
          },
        };
      }
    }

    if (status && status.toUpperCase() !== 'ALL') {
      const s = status.toUpperCase();
      if (s === 'HIRED') {
        where.applications = {
          some: {
            status: 'HIRED',
          },
        };
      } else if (s === 'REJECTED') {
        where.applications = {
          some: {
            status: 'REJECTED',
          },
          none: {
            status: 'HIRED',
          },
        };
      } else if (s === 'ACTIVE') {
        where.NOT = {
          applications: {
            some: {
              status: { in: ['HIRED', 'REJECTED'] },
            },
          },
        };
      } else if (s === 'TOP_MATCH' || s === 'STRONG_MATCH') {
        where.applications = {
          some: {
            screeningResults: {
              some: {
                recommendation: { in: ['STRONG_MATCH', 'GOOD_MATCH'] },
              },
            },
          },
        };
      }
    }

    const orderBy: Prisma.CandidateOrderByWithRelationInput =
      sortBy === 'name'
        ? { name: sortOrder }
        : sortBy === 'email'
          ? { email: sortOrder }
          : { createdAt: sortOrder };

    const [candidates, total] = await prisma.$transaction([
      prisma.candidate.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: candidateWithRelations,
      }),
      prisma.candidate.count({ where }),
    ]);

    return { candidates, total };
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(data: CreateCandidateInput): Promise<CandidateWithRelations> {
    const { name, email, phone, location, summary, skills, education, experience } = data;

    return prisma.$transaction(async (tx) => {
      // Create core candidate record
      const candidate = await tx.candidate.create({
        data: { name, email, phone, location, summary },
      });

      // Upsert skills
      for (const s of skills) {
        const skill = await tx.skill.upsert({
          where: { name: s.name },
          create: { name: s.name },
          update: {},
        });
        await tx.candidateSkill.create({
          data: {
            candidateId: candidate.id,
            skillId: skill.id,
            yearsOfExperience: s.yearsOfExperience,
            proficiencyLevel: s.proficiencyLevel,
          },
        });
      }

      // Create education records
      for (const edu of education) {
        await tx.education.create({
          data: {
            candidateId: candidate.id,
            institution: edu.institution,
            degree: edu.degree,
            field: edu.field,
            startDate: edu.startDate,
            endDate: edu.endDate,
          },
        });
      }

      // Create experience records
      for (const exp of experience) {
        await tx.experience.create({
          data: {
            candidateId: candidate.id,
            company: exp.company,
            jobTitle: exp.jobTitle,
            description: exp.description,
            startDate: exp.startDate,
            endDate: exp.endDate,
            years: exp.years,
          },
        });
      }

      return tx.candidate.findUniqueOrThrow({
        where: { id: candidate.id },
        include: candidateWithRelations,
      });
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(id: string, data: UpdateCandidateInput): Promise<CandidateWithRelations> {
    await prisma.candidate.update({ where: { id }, data });
    return prisma.candidate.findUniqueOrThrow({
      where: { id },
      include: candidateWithRelations,
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    await prisma.candidate.delete({ where: { id } });
  }

  // ── Skills ─────────────────────────────────────────────────────────────────

  async addSkill(
    candidateId: string,
    skillName: string,
    yearsOfExperience?: number,
    proficiencyLevel?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const skill = await tx.skill.upsert({
        where: { name: skillName },
        create: { name: skillName },
        update: {},
      });

      return tx.candidateSkill.upsert({
        where: { candidateId_skillId: { candidateId, skillId: skill.id } },
        create: { candidateId, skillId: skill.id, yearsOfExperience, proficiencyLevel },
        update: { yearsOfExperience, proficiencyLevel },
        include: { skill: true },
      });
    });
  }

  async removeSkill(candidateId: string, skillId: string): Promise<void> {
    await prisma.candidateSkill.delete({
      where: { candidateId_skillId: { candidateId, skillId } },
    });
  }

  // ── Education ──────────────────────────────────────────────────────────────

  async addEducation(
    candidateId: string,
    data: { institution: string; degree: string; field?: string; startDate?: Date; endDate?: Date }
  ) {
    return prisma.education.create({
      data: { candidateId, ...data },
    });
  }

  async removeEducation(id: string, candidateId: string): Promise<void> {
    await prisma.education.delete({ where: { id, candidateId } });
  }

  // ── Experience ─────────────────────────────────────────────────────────────

  async addExperience(
    candidateId: string,
    data: {
      company: string;
      jobTitle: string;
      description?: string;
      startDate?: Date;
      endDate?: Date;
      years?: number;
    }
  ) {
    return prisma.experience.create({
      data: { candidateId, ...data },
    });
  }

  async removeExperience(id: string, candidateId: string): Promise<void> {
    await prisma.experience.delete({ where: { id, candidateId } });
  }
}

export const candidateRepository = new CandidateRepository();
