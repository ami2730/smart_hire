import { apiClient } from "./client";

export type JobStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";

export interface Job {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employmentType?: string | null;
  responsibilities?: string | null;
  description: string;
  requiredSkills: string[];
  educationRequirements: string[];
  minimumExperienceYears: number | null;
  status: JobStatus;
  createdBy: string | null;
  applicationCount?: number;
  screeningCount?: number;
  topMatchScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface JobsListResponse {
  jobs: Job[];
  total?: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateJobInput {
  title: string;
  department?: string;
  location?: string;
  employmentType?: string;
  responsibilities?: string;
  description: string;
  requiredSkills?: string[];
  educationRequirements?: string[] | string;
  minimumExperienceYears?: number;
  status?: JobStatus;
}

export interface UpdateJobInput extends Partial<CreateJobInput> {}

export interface JobFilters {
  page?: number;
  limit?: number;
  status?: JobStatus;
  search?: string;
  department?: string;
  recruiterId?: string;
}

export function normalizeJob(raw: any): Job {
  if (!raw) {
    throw new Error("Cannot normalize undefined job");
  }

  const reqs = raw.requirements || {};
  const rawSkills = raw.requiredSkills || reqs.requiredSkills || [];
  const requiredSkills = Array.isArray(rawSkills) ? rawSkills : [];
  const rawEdu = raw.educationRequirements || reqs.educationRequirements;
  const educationRequirements = Array.isArray(rawEdu)
    ? rawEdu
    : rawEdu
      ? [String(rawEdu)]
      : [];

  // Map backend PUBLISHED to ACTIVE for frontend display consistency
  let status: JobStatus = "DRAFT";
  if (raw.status === "PUBLISHED" || raw.status === "ACTIVE") {
    status = "ACTIVE";
  } else if (raw.status === "CLOSED") {
    status = "CLOSED";
  } else if (raw.status === "ARCHIVED") {
    status = "ARCHIVED";
  }

  return {
    id: raw.id,
    title: raw.title || "Untitled Position",
    department: raw.department || "Engineering",
    location: raw.location || "Hybrid / Remote",
    description: raw.description || "",
    requiredSkills,
    educationRequirements,
    minimumExperienceYears: raw.minimumExperienceYears ?? reqs.minimumExperienceYears ?? 0,
    employmentType: raw.employmentType || "Full-time",
    responsibilities: raw.responsibilities || null,
    status,
    createdBy: raw.recruiter?.name || raw.createdBy || null,
    applicationCount: raw._count?.applications ?? raw.applicationCount ?? 0,
    screeningCount: raw.screeningCount ?? 0,
    topMatchScore: raw.topMatchScore,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export const jobsApi = {
  async list(filters?: JobFilters): Promise<JobsListResponse> {
    const params: Record<string, string | number | boolean | undefined> = {
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 50,
      search: filters?.search || undefined,
      department: filters?.department || undefined,
      recruiterId: filters?.recruiterId || undefined,
    };
    if (filters?.status) {
      params.status = filters.status === "ACTIVE" ? "PUBLISHED" : filters.status;
    }

    const res = await apiClient<any>("/jobs", { params });
    const rawJobs = Array.isArray(res) ? res : res?.jobs ?? [];
    const pagination = res?.pagination ?? {
      page: params.page,
      limit: params.limit,
      total: rawJobs.length,
      totalPages: 1,
    };

    return {
      jobs: rawJobs.map(normalizeJob),
      pagination,
    };
  },

  async getById(id: string): Promise<Job> {
    const raw = await apiClient<any>(`/jobs/${id}`);
    const jobData = raw?.job || raw;
    return normalizeJob(jobData);
  },

  async create(input: CreateJobInput): Promise<Job> {
    const educationRequirements = Array.isArray(input.educationRequirements)
      ? input.educationRequirements.join(", ")
      : input.educationRequirements;

    const payload = {
      title: input.title,
      description: input.description,
      minimumExperienceYears: input.minimumExperienceYears ?? 0,
      requiredSkills: input.requiredSkills ?? [],
      educationRequirements: educationRequirements || undefined,
    };

    const created = await apiClient<any>("/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const job = normalizeJob(created?.job || created);

    // If status requested was ACTIVE, immediately publish it
    if (input.status === "ACTIVE") {
      try {
        await apiClient<any>(`/jobs/${job.id}/publish`, { method: "POST" });
        job.status = "ACTIVE";
      } catch {
        // preserve draft if publish encounters error
      }
    }

    return job;
  },

  async update(id: string, input: UpdateJobInput): Promise<Job> {
    const educationRequirements = Array.isArray(input.educationRequirements)
      ? input.educationRequirements.join(", ")
      : input.educationRequirements;

    const payload = {
      title: input.title,
      description: input.description,
      minimumExperienceYears: input.minimumExperienceYears,
      requiredSkills: input.requiredSkills,
      educationRequirements: educationRequirements || undefined,
      status: input.status === "ACTIVE" ? "PUBLISHED" : input.status,
    };

    const updated = await apiClient<any>(`/jobs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return normalizeJob(updated?.job || updated);
  },

  async publish(id: string): Promise<Job> {
    const data = await apiClient<any>(`/jobs/${id}/publish`, { method: "POST" });
    return normalizeJob(data?.job || data);
  },

  async close(id: string): Promise<Job> {
    const data = await apiClient<any>(`/jobs/${id}/close`, { method: "POST" });
    return normalizeJob(data?.job || data);
  },

  async delete(id: string): Promise<void> {
    await apiClient<void>(`/jobs/${id}`, { method: "DELETE" });
  },
};
