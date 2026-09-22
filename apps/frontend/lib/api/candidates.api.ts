import { apiClient } from "./client";

export interface CandidateSkill {
  id: string;
  name: string;
  proficiency: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" | null;
  source?: "MANUAL" | "RESUME_PARSED";
}

export interface CandidateEducation {
  id: string;
  degree: string;
  institution: string;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  graduationYear?: number | null;
  startYear?: number | null;
  endYear?: number | null;
}

export interface CandidateExperience {
  id: string;
  jobTitle: string;
  company: string;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  years?: number | null;
  isCurrent?: boolean;
}

export interface CandidateResume {
  id: string;
  candidateId: string;
  originalFileName: string;
  storedFileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  extractedText?: string | null;
  processingStatus: "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";
  uploadedAt: string;
  processedAt?: string | null;
}

export interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  summary?: string | null;
  resumeText?: string | null;
  status: "ACTIVE" | "INACTIVE" | "HIRED" | "REJECTED";
  skills: CandidateSkill[];
  education: CandidateEducation[];
  experience: CandidateExperience[];
  resumes?: CandidateResume[];
  totalExperienceYears?: number;
  applicationCount?: number;
  latestMatchScore?: number;
  latestRecommendation?: string;
  latestApplicationStatus?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CandidatesListResponse {
  candidates: Candidate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CandidateFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  skill?: string;
}

export function normalizeCandidate(raw: any): Candidate {
  if (!raw) {
    throw new Error("Cannot normalize undefined candidate");
  }

  const rawSkills = Array.isArray(raw.skills) ? raw.skills : [];
  const skills: CandidateSkill[] = rawSkills.map((s: any) => ({
    id: s.id || s.skillId || `skill-${Math.random()}`,
    name: s.name || s.skill?.name || "Skill",
    proficiency: s.proficiencyLevel || s.proficiency || "ADVANCED",
    source: s.source || "RESUME_PARSED",
  }));

  const rawEdu = Array.isArray(raw.education) ? raw.education : [];
  const education: CandidateEducation[] = rawEdu.map((e: any) => {
    const startDate = e.startDate || null;
    const endDate = e.endDate || null;
    const startYear = startDate ? new Date(startDate).getFullYear() : (e.startYear ?? null);
    const endYear = endDate ? new Date(endDate).getFullYear() : (e.endYear ?? null);
    return {
      id: e.id || `edu-${Math.random()}`,
      degree: e.degree || "Degree",
      institution: e.institution || "Institution",
      fieldOfStudy: e.field || e.fieldOfStudy || null,
      startDate,
      endDate,
      graduationYear: endYear,
      startYear,
      endYear,
    };
  });

  const rawExp = Array.isArray(raw.experience) ? raw.experience : [];
  const experience: CandidateExperience[] = rawExp.map((ex: any) => ({
    id: ex.id || `exp-${Math.random()}`,
    jobTitle: ex.jobTitle || "Software Engineer",
    company: ex.company || "Company",
    startDate: ex.startDate || null,
    endDate: ex.endDate || null,
    description: ex.description || null,
    years: ex.years ?? null,
    isCurrent: ex.isCurrent ?? (!ex.endDate),
  }));

  const expYears = experience.reduce((acc, exp) => {
    if (exp.years) return acc + exp.years;
    const start = exp.startDate ? new Date(exp.startDate).getFullYear() : null;
    const end = exp.endDate
      ? new Date(exp.endDate).getFullYear()
      : exp.isCurrent
        ? new Date().getFullYear()
        : null;
    if (start && end) return acc + Math.max(0, end - start);
    return acc;
  }, 0);

  return {
    id: raw.id,
    fullName: raw.name || raw.fullName || "Candidate",
    email: raw.email || "",
    phone: raw.phone || null,
    location: raw.location || "Addis Ababa, Ethiopia",
    linkedinUrl: raw.linkedinUrl || null,
    portfolioUrl: raw.portfolioUrl || null,
    summary: raw.summary || null,
    resumeText: raw.resumes?.[0]?.extractedText || raw.resumeText || null,
    status: raw.status || "ACTIVE",
    skills,
    education,
    experience,
    resumes: raw.resumes || [],
    totalExperienceYears: Math.round(expYears * 10) / 10,
    applicationCount: raw._count?.applications ?? raw.applicationCount ?? 0,
    latestMatchScore: raw.latestMatchScore ?? undefined,
    latestRecommendation: raw.latestRecommendation ?? undefined,
    latestApplicationStatus: raw.latestApplicationStatus ?? null,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export const candidatesApi = {
  async list(filters?: CandidateFilters): Promise<CandidatesListResponse> {
    const params: Record<string, string | number | boolean | undefined> = {
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 50,
      search: filters?.search || undefined,
      status: filters?.status || undefined,
      skill: filters?.skill || undefined,
    };

    const res = await apiClient<any>("/candidates", { params });
    const rawCands = Array.isArray(res) ? res : res?.candidates ?? [];
    const pagination = res?.pagination ?? {
      page: params.page,
      limit: params.limit,
      total: rawCands.length,
      totalPages: 1,
    };

    return {
      candidates: rawCands.map(normalizeCandidate),
      pagination,
    };
  },

  async getById(id: string): Promise<Candidate> {
    const res = await apiClient<any>(`/candidates/${id}`);
    const raw = res?.candidate || res;
    return normalizeCandidate(raw);
  },

  async uploadResume(candidateId: string, file: File): Promise<CandidateResume> {
    const formData = new FormData();
    formData.append("resume", file);

    const res = await apiClient<any>(`/candidates/${candidateId}/resumes`, {
      method: "POST",
      body: formData,
    });
    return res?.resume || res;
  },

  async getResumes(candidateId: string): Promise<CandidateResume[]> {
    const res = await apiClient<any>(`/candidates/${candidateId}/resumes`);
    return res?.resumes || (Array.isArray(res) ? res : []);
  },
};
