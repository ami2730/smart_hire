import { apiClient } from "./client";

export interface ApplicantSkillItem {
  id: string;
  skillId?: string;
  name?: string;
  skill?: {
    id: string;
    name: string;
  };
  proficiencyLevel?: string;
  yearsOfExperience?: number;
}

export interface ApplicantExperienceItem {
  id: string;
  company: string;
  jobTitle: string;
  description?: string | null;
  years?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface ApplicantEducationItem {
  id: string;
  degree: string;
  field?: string | null;
  institution: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface ApplicantProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  summary?: string | null;
  skills: ApplicantSkillItem[];
  education: ApplicantEducationItem[];
  experience: ApplicantExperienceItem[];
  resumes: ApplicantResume[];
}

export interface ApplicantResume {
  id: string;
  candidateId: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  isDefault?: boolean;
}

export interface ApplicantApplication {
  id: string;
  jobId: string;
  candidateId: string;
  status: string;
  appliedAt: string;
  coverLetter?: string | null;
  source?: string;
  job: {
    id: string;
    title: string;
    description: string;
    location?: string | null;
    employmentType?: string | null;
    status: string;
    publishedAt?: string | null;
    recruiter?: {
      id: string;
      name: string;
    };
  };
  resume?: {
    id: string;
    originalFileName: string;
    uploadedAt: string;
  } | null;
}

export const applicantApi = {
  async getProfile(): Promise<ApplicantProfile> {
    const res = await apiClient<{ profile: ApplicantProfile }>("/applicant/profile", {
      method: "GET",
    });
    return res.profile;
  },

  async syncResume(resumeId?: string): Promise<{ profile: ApplicantProfile }> {
    const res = await apiClient<{ profile: ApplicantProfile }>("/applicant/profile/sync-resume", {
      method: "POST",
      body: JSON.stringify({ resumeId }),
    });
    return res;
  },

  async updateProfile(data: {
    name?: string;
    phone?: string;
    location?: string;
    summary?: string;
  }): Promise<ApplicantProfile> {
    const res = await apiClient<{ profile: ApplicantProfile }>("/applicant/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return res.profile;
  },

  async getResumes(): Promise<ApplicantResume[]> {
    const res = await apiClient<{ resumes: ApplicantResume[] }>("/applicant/resumes", {
      method: "GET",
    });
    return res.resumes;
  },

  async uploadResume(file: File, isDefault = false): Promise<ApplicantResume> {
    const formData = new FormData();
    formData.append("resume", file);
    if (isDefault) {
      formData.append("isDefault", "true");
    }

    const res = await apiClient<{ resume: ApplicantResume }>("/applicant/resumes", {
      method: "POST",
      body: formData,
    });
    return res.resume;
  },

  async deleteResume(id: string): Promise<void> {
    await apiClient<{ message: string }>(`/applicant/resumes/${id}`, {
      method: "DELETE",
    });
  },

  async getApplications(): Promise<ApplicantApplication[]> {
    const res = await apiClient<{ applications: ApplicantApplication[] }>(
      "/applicant/applications",
      {
        method: "GET",
      }
    );
    return res.applications;
  },

  async getApplicationById(id: string): Promise<ApplicantApplication> {
    const res = await apiClient<{ application: ApplicantApplication }>(
      `/applicant/applications/${id}`,
      {
        method: "GET",
      }
    );
    return res.application;
  },

  async applyForJob(data: {
    jobId: string;
    resumeId?: string;
    coverLetter?: string;
  }): Promise<ApplicantApplication> {
    const res = await apiClient<{ application: ApplicantApplication }>(
      "/applicant/applications",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    return res.application;
  },

  async withdrawApplication(id: string): Promise<ApplicantApplication> {
    const res = await apiClient<{ application: ApplicantApplication }>(
      `/applicant/applications/${id}/withdraw`,
      {
        method: "POST",
      }
    );
    return res.application;
  },
};
