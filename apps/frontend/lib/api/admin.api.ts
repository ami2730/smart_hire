import { apiClient } from "./client";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "RECRUITER" | "APPLICANT";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReportOverview {
  totalUsers: number;
  totalRecruiters: number;
  totalApplicants: number;
  totalJobs: number;
  totalApplications: number;
  totalScreenings: number;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  userId?: string | null;
  details?: any;
  createdAt: string;
}

export const adminApi = {
  async getUsers(params?: {
    role?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ users: AdminUser[]; pagination: any }> {
    const query = new URLSearchParams();
    if (params?.role) query.set("role", params.role);
    if (params?.isActive !== undefined) query.set("isActive", String(params.isActive));
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const qs = query.toString();
    const endpoint = `/admin/users${qs ? `?${qs}` : ""}`;
    return apiClient<{ users: AdminUser[]; pagination: any }>(endpoint, {
      method: "GET",
    });
  },

  async updateUserStatus(userId: string, isActive: boolean): Promise<AdminUser> {
    const res = await apiClient<{ user: AdminUser }>(`/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
    return res.user;
  },

  async getReports(): Promise<{ overview: AdminReportOverview; jobStats: any }> {
    return apiClient<{ overview: AdminReportOverview; jobStats: any }>("/admin/reports", {
      method: "GET",
    });
  },

  async getAuditLogs(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ logs: AdminAuditLog[]; pagination: any }> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const qs = query.toString();
    const endpoint = `/admin/audit-logs${qs ? `?${qs}` : ""}`;
    return apiClient<{ logs: AdminAuditLog[]; pagination: any }>(endpoint, {
      method: "GET",
    });
  },
};
