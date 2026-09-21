import { candidateRepository, CandidateWithRelations } from '../repositories/candidate.repository';
import { NotFoundError, ConflictError } from '../utils/errors';
import {
  CreateCandidateInput,
  UpdateCandidateInput,
  CandidateQueryInput,
  AddSkillInput,
  AddEducationInput,
  AddExperienceInput,
} from '../schemas/candidate.schema';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ── Shape the candidate response — strip nothing, all data is safe ────────────
function formatCandidate(candidate: CandidateWithRelations) {
  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    location: candidate.location,
    summary: candidate.summary,
    skills: candidate.skills.map((cs) => ({
      id: cs.id,
      skillId: cs.skillId,
      name: cs.skill.name,
      category: cs.skill.category,
      yearsOfExperience: cs.yearsOfExperience,
      proficiencyLevel: cs.proficiencyLevel,
    })),
    education: candidate.education.map((edu) => ({
      id: edu.id,
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field,
      startDate: edu.startDate,
      endDate: edu.endDate,
    })),
    experience: candidate.experience.map((exp) => ({
      id: exp.id,
      company: exp.company,
      jobTitle: exp.jobTitle,
      description: exp.description,
      startDate: exp.startDate,
      endDate: exp.endDate,
      years: exp.years,
    })),
    resumes: candidate.resumes,
    userId: candidate.userId,
    applicationCount: candidate._count.applications,
    latestMatchScore: (() => {
      const screenedApp = candidate.applications?.find(
        (a: any) => a.screeningResults && a.screeningResults.length > 0
      );
      const latest = screenedApp?.screeningResults?.[0];
      return latest?.overallScore !== undefined && latest?.overallScore !== null
        ? Math.round(latest.overallScore)
        : undefined;
    })(),
    latestRecommendation: (() => {
      const screenedApp = candidate.applications?.find(
        (a: any) => a.screeningResults && a.screeningResults.length > 0
      );
      const latest = screenedApp?.screeningResults?.[0];
      return latest?.recommendation ?? undefined;
    })(),
    status: (() => {
      const apps = candidate.applications || [];
      if (apps.some((a: any) => a.status === 'HIRED')) return 'HIRED';
      if (apps.length > 0 && apps.every((a: any) => a.status === 'REJECTED')) return 'REJECTED';
      return 'ACTIVE';
    })(),
    latestApplicationStatus: candidate.applications?.[0]?.status ?? null,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

class CandidateService {
  // ── List ───────────────────────────────────────────────────────────────────

  async listCandidates(query: CandidateQueryInput): Promise<{
    candidates: ReturnType<typeof formatCandidate>[];
    pagination: PaginationMeta;
  }> {
    const { candidates, total } = await candidateRepository.findAll(query);
    const totalPages = Math.ceil(total / query.limit);

    return {
      candidates: candidates.map(formatCandidate),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    };
  }

  // ── Get by ID ──────────────────────────────────────────────────────────────

  async getCandidateById(id: string): Promise<ReturnType<typeof formatCandidate>> {
    const candidate = await candidateRepository.findById(id);
    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }
    return formatCandidate(candidate);
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  async createCandidate(
    data: CreateCandidateInput
  ): Promise<ReturnType<typeof formatCandidate>> {
    // Enforce unique email
    const existing = await candidateRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError(
        `A candidate with email '${data.email}' already exists`
      );
    }

    const candidate = await candidateRepository.create(data);
    return formatCandidate(candidate);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  

  // ── Delete ─────────────────────────────────────────────────────────────────

  async deleteCandidate(id: string): Promise<void> {
    const existing = await candidateRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Candidate not found');
    }
    await candidateRepository.delete(id);
  }

  // ── Skills ─────────────────────────────────────────────────────────────────

  async addSkill(candidateId: string, input: AddSkillInput) {
    const candidate = await candidateRepository.findById(candidateId);
    if (!candidate) throw new NotFoundError('Candidate not found');

    const candidateSkill = await candidateRepository.addSkill(
      candidateId,
      input.name,
      input.yearsOfExperience,
      input.proficiencyLevel
    );

    return {
      id: candidateSkill.id,
      skillId: candidateSkill.skillId,
      name: candidateSkill.skill.name,
      yearsOfExperience: candidateSkill.yearsOfExperience,
      proficiencyLevel: candidateSkill.proficiencyLevel,
    };
  }

  async removeSkill(candidateId: string, skillId: string): Promise<void> {
    const candidate = await candidateRepository.findById(candidateId);
    if (!candidate) throw new NotFoundError('Candidate not found');

    const skillExists = candidate.skills.some((s) => s.skillId === skillId);
    if (!skillExists) {
      throw new NotFoundError('Skill not found on this candidate');
    }

    await candidateRepository.removeSkill(candidateId, skillId);
  }

  // ── Education ──────────────────────────────────────────────────────────────

  async addEducation(candidateId: string, input: AddEducationInput) {
    const candidate = await candidateRepository.findById(candidateId);
    if (!candidate) throw new NotFoundError('Candidate not found');

    return candidateRepository.addEducation(candidateId, input);
  }

  async removeEducation(candidateId: string, educationId: string): Promise<void> {
    const candidate = await candidateRepository.findById(candidateId);
    if (!candidate) throw new NotFoundError('Candidate not found');

    const eduExists = candidate.education.some((e) => e.id === educationId);
    if (!eduExists) {
      throw new NotFoundError('Education record not found for this candidate');
    }

    await candidateRepository.removeEducation(educationId, candidateId);
  }

  // ── Experience ─────────────────────────────────────────────────────────────

  async addExperience(candidateId: string, input: AddExperienceInput) {
    const candidate = await candidateRepository.findById(candidateId);
    if (!candidate) throw new NotFoundError('Candidate not found');

    return candidateRepository.addExperience(candidateId, input);
  }

  async removeExperience(candidateId: string, experienceId: string): Promise<void> {
    const candidate = await candidateRepository.findById(candidateId);
    if (!candidate) throw new NotFoundError('Candidate not found');

    const expExists = candidate.experience.some((e) => e.id === experienceId);
    if (!expExists) {
      throw new NotFoundError('Experience record not found for this candidate');
    }

    await candidateRepository.removeExperience(experienceId, candidateId);
  }
}

export const candidateService = new CandidateService();
