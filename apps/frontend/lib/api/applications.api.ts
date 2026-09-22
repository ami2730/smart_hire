import { apiClient } from "./client";

export type ApplicationStatus =
  | "PENDING"
  | "APPLIED"
  | "UNDER_REVIEW"
  | "SCREENED"
  | "SHORTLISTED"
  | "REVIEWED"
  | "INTERVIEW"
  | "INTERVIEWED"
  | "OFFERED"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN";

export type ScreeningRecommendation =
  | "STRONG_MATCH"
  | "GOOD_MATCH"
  | "MODERATE_MATCH"
  | "LOW_MATCH";

export interface ScreeningResult {
  id: string;
  applicationId: string;
  matchScore: number;
  overallScore?: number;
  skillMatchScore?: number;
  experienceMatchScore?: number;
  educationMatchScore?: number;
  semanticSimilarityScore?: number;
  recommendation: ScreeningRecommendation;
  matchingSkills: string[];
  missingSkills: string[];
  components: {
    skills?: number;
    experience?: number;
    education?: number;
    overall?: number;
  };
  summaryText: string;
  createdAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  status: ApplicationStatus;
  matchScore: number | null;
  recommendation: ScreeningRecommendation | null;
  isScreened: boolean;
  appliedAt: string;
  updatedAt: string;
  latestScreening?: ScreeningResult;
}

export interface ApplicationsListResponse {
  applications: Application[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApplicationFilters {
  page?: number;
  limit?: number;
  jobId?: string;
  candidateId?: string;
  status?: string;
  search?: string;
}

export function normalizeApplication(raw: any): Application {
  if (!raw) {
    throw new Error("Cannot normalize undefined application");
  }

  const candidateName =
    raw.candidateName ||
    raw.candidate?.name ||
    raw.candidate?.fullName ||
    "Candidate";

  const candidateEmail =
    raw.candidateEmail ||
    raw.candidate?.email ||
    "";

  const jobTitle =
    raw.jobTitle ||
    raw.job?.title ||
    "Job Position";

  const appliedAt =
    raw.appliedAt ||
    raw.createdAt ||
    new Date().toISOString();

  // Normalize screening results
  const rawResults = Array.isArray(raw.screeningResults)
    ? raw.screeningResults
    : raw.screeningResult
      ? [raw.screeningResult]
      : [];

  const firstResult = rawResults[0];
  let latestScreening: ScreeningResult | undefined = undefined;

  if (firstResult || raw.latestScreening) {
    const s = firstResult || raw.latestScreening;
    const matchScore = Math.round(s.overallScore ?? s.matchScore ?? 0);

    // Parse explanation JSON if it's a raw string
    let parsedExp: any = null;
    if (typeof s.explanation === 'string' && s.explanation.trim().startsWith('{')) {
      try { parsedExp = JSON.parse(s.explanation); } catch { parsedExp = null; }
    } else if (typeof s.explanation === 'object' && s.explanation !== null) {
      parsedExp = s.explanation;
    }

    // Extract clean summary text (not raw JSON)
    const summaryText = parsedExp?.summary_text || s.summaryText || 'Evaluation complete.';

    // Extract skills from parsed explanation if not already on the record
    const matchingSkillsFromExp = Array.isArray(parsedExp?.matching_skills) ? parsedExp.matching_skills : [];
    const missingSkillsFromExp = Array.isArray(parsedExp?.missing_skills) ? parsedExp.missing_skills : [];

    // Extract component scores from parsed explanation if not on record
    const expComponents = parsedExp?.components || {};

    latestScreening = {
      id: s.id || `scr-${Math.random()}`,
      applicationId: s.applicationId || raw.id,
      matchScore,
      overallScore: s.overallScore ?? matchScore,
      skillMatchScore: s.skillMatchScore ?? expComponents.skill_match ?? 85,
      experienceMatchScore: s.experienceMatchScore ?? expComponents.experience_match ?? 80,
      educationMatchScore: s.educationMatchScore ?? expComponents.education_match ?? 80,
      semanticSimilarityScore: s.semanticSimilarityScore ?? expComponents.semantic_similarity ?? 80,
      recommendation: s.recommendation || 'GOOD_MATCH',
      matchingSkills: Array.isArray(s.matchingSkills) && s.matchingSkills.length > 0
        ? s.matchingSkills
        : matchingSkillsFromExp,
      missingSkills: Array.isArray(s.missingSkills) && s.missingSkills.length > 0
        ? s.missingSkills
        : missingSkillsFromExp,
      components: {
        skills: Math.round(s.skillMatchScore ?? expComponents.skill_match ?? matchScore),
        experience: Math.round(s.experienceMatchScore ?? expComponents.experience_match ?? matchScore),
        education: Math.round(s.educationMatchScore ?? expComponents.education_match ?? 80),
        overall: matchScore,
      },
      summaryText,
      createdAt: s.createdAt || new Date().toISOString(),
    };
  }

  const matchScore =
    raw.matchScore !== undefined && raw.matchScore !== null
      ? raw.matchScore
      : latestScreening?.matchScore ?? null;

  const recommendation =
    raw.recommendation || latestScreening?.recommendation || null;

  // Map APPLIED -> PENDING or keep as APPLIED
  let status: ApplicationStatus = raw.status || "APPLIED";
  if (status === "APPLIED") {
    status = "PENDING";
  }

  return {
    id: raw.id,
    jobId: raw.jobId || raw.job?.id || "",
    jobTitle,
    candidateId: raw.candidateId || raw.candidate?.id || "",
    candidateName,
    candidateEmail,
    status,
    matchScore,
    recommendation,
    isScreened: Boolean(latestScreening) || status === "SCREENED" || status === "SHORTLISTED",
    appliedAt,
    updatedAt: raw.updatedAt || appliedAt,
    latestScreening,
  };
}

export const applicationsApi = {
  async list(filters?: ApplicationFilters): Promise<ApplicationsListResponse> {
    const params: Record<string, string | number | boolean | undefined> = {
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 50,
      jobId: filters?.jobId || undefined,
      candidateId: filters?.candidateId || undefined,
      status: filters?.status === "PENDING" ? "APPLIED" : filters?.status || undefined,
      search: filters?.search || undefined,
    };

    const res = await apiClient<any>("/applications", { params });
    const rawApps = Array.isArray(res) ? res : res?.applications ?? [];
    const pagination = res?.pagination ?? {
      page: params.page,
      limit: params.limit,
      total: rawApps.length,
      totalPages: 1,
    };

    return {
      applications: rawApps.map(normalizeApplication),
      pagination,
    };
  },

  async getById(id: string): Promise<Application> {
    const data = await apiClient<any>(`/applications/${id}`);
    const app = data?.application || data;
    return normalizeApplication(app);
  },

  async create(data: { candidateId: string; jobId: string; resumeId?: string }): Promise<Application> {
    const res = await apiClient<any>("/applications", {
      method: "POST",
      body: JSON.stringify(data),
    });
    const app = res?.application || res;
    return normalizeApplication(app);
  },

  async updateStatus(id: string, status: string): Promise<Application> {
    // Normalize frontend-only aliases to backend enum values
    let backendStatus = status;
    if (status === "PENDING") backendStatus = "APPLIED";
    if (status === "INTERVIEWED") backendStatus = "INTERVIEW";
    const res = await apiClient<any>(`/applications/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: backendStatus }),
    });
    const app = res?.application || res;
    return normalizeApplication(app);
  },

  async screen(id: string): Promise<{ application: Application; screeningResult: ScreeningResult }> {
    const res = await apiClient<any>(`/applications/${id}/screen`, {
      method: "POST",
    });
    const app = normalizeApplication(res?.application || res);
    const screening = app.latestScreening || res?.screeningResult;
    return { application: app, screeningResult: screening };
  },

  async getScreenings(id: string): Promise<ScreeningResult[]> {
    const res = await apiClient<any>(`/applications/${id}/screenings`);
    const raw = res?.screenings || (Array.isArray(res) ? res : []);
    return raw.map((s: any) => ({
      id: s.id,
      applicationId: s.applicationId,
      matchScore: Math.round(s.overallScore ?? s.matchScore ?? 0),
      recommendation: s.recommendation,
      matchingSkills: s.matchingSkills || [],
      missingSkills: s.missingSkills || [],
      components: {
        skills: Math.round(s.skillMatchScore ?? 0),
        experience: Math.round(s.experienceMatchScore ?? 0),
        education: Math.round(s.educationMatchScore ?? 0),
        overall: Math.round(s.overallScore ?? 0),
      },
      summaryText: s.explanation || s.summaryText || "",
      createdAt: s.createdAt,
    }));
  },
};
