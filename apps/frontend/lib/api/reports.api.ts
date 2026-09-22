import { apiClient } from "./client";

export interface OverviewMetrics {
  totalJobs: number;
  activeJobs: number;
  totalCandidates: number;
  totalApplications: number;
  totalScreenings: number;
  averageMatchScore: number;
}

export interface ActivityTrendPoint {
  date: string;
  applications: number;
  screenings: number;
}

export interface ScreeningDistributionItem {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ScoreDistributionItem {
  range: string;
  count: number;
  fill: string;
}

export interface RecentApplication {
  id: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  matchScore: number;
  status: "SCREENED" | "STRONG_MATCH" | "UNDER_REVIEW" | "PENDING";
  appliedAt: string;
  timeAgo: string;
}

export interface DashboardAnalytics {
  trends: ActivityTrendPoint[];
  screeningDistribution: ScreeningDistributionItem[];
  scoreDistribution: ScoreDistributionItem[];
  recentApplications: RecentApplication[];
}

export const reportsApi = {
  async getOverview(): Promise<OverviewMetrics> {
    try {
      const data = await apiClient<OverviewMetrics>("/reports/overview");
      return {
        totalJobs: data?.totalJobs ?? 0,
        activeJobs: data?.activeJobs ?? 0,
        totalCandidates: data?.totalCandidates ?? 0,
        totalApplications: data?.totalApplications ?? 0,
        totalScreenings: data?.totalScreenings ?? 0,
        averageMatchScore: data?.averageMatchScore ?? 0,
      };
    } catch {
      return {
        totalJobs: 0,
        activeJobs: 0,
        totalCandidates: 0,
        totalApplications: 0,
        totalScreenings: 0,
        averageMatchScore: 0,
      };
    }
  },

  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    const [screeningRes, appsRes] = await Promise.allSettled([
      apiClient<any>("/reports/screening"),
      apiClient<any>("/applications?limit=20"),
    ]);

    const screeningData = screeningRes.status === "fulfilled" ? screeningRes.value : null;
    const appsPayload = appsRes.status === "fulfilled" ? appsRes.value : null;
    const rawApps: any[] = Array.isArray(appsPayload?.data)
      ? appsPayload.data
      : Array.isArray(appsPayload?.applications)
        ? appsPayload.applications
        : Array.isArray(appsPayload)
          ? appsPayload
          : [];

    // 1. Compute screening distribution from real evaluations
    const rec = screeningData?.recommendations || {};
    const strongCount = rec.STRONG_MATCH || 0;
    const goodCount = rec.GOOD_MATCH || 0;
    const modCount = rec.MODERATE_MATCH || 0;
    const lowCount = rec.LOW_MATCH || 0;
    const totalScreened = strongCount + goodCount + modCount + lowCount;

    const screeningDistribution: ScreeningDistributionItem[] = [
      {
        name: "Strong Match (>=85%)",
        count: strongCount,
        percentage: totalScreened > 0 ? Math.round((strongCount / totalScreened) * 100) : 0,
        color: "#10b981",
      },
      {
        name: "Good Match (70-84%)",
        count: goodCount,
        percentage: totalScreened > 0 ? Math.round((goodCount / totalScreened) * 100) : 0,
        color: "#3b82f6",
      },
      {
        name: "Moderate (55-69%)",
        count: modCount,
        percentage: totalScreened > 0 ? Math.round((modCount / totalScreened) * 100) : 0,
        color: "#f59e0b",
      },
      {
        name: "Low Match (<55%)",
        count: lowCount,
        percentage: totalScreened > 0 ? Math.round((lowCount / totalScreened) * 100) : 0,
        color: "#94a3b8",
      },
    ];

    // 2. Score distribution from real applications
    const scoreDistribution: ScoreDistributionItem[] = [
      { range: "90-100%", count: 0, fill: "#10b981" },
      { range: "80-89%", count: 0, fill: "#3b82f6" },
      { range: "70-79%", count: 0, fill: "#6366f1" },
      { range: "60-69%", count: 0, fill: "#f59e0b" },
      { range: "<60%", count: 0, fill: "#94a3b8" },
    ];

    rawApps.forEach((app: any) => {
      const score =
        app.latestScreening?.overallScore ??
        app.screeningResults?.[0]?.overallScore ??
        app.matchScore ??
        null;
      if (score !== null) {
        const s = Number(score);
        if (s >= 90) scoreDistribution[0].count++;
        else if (s >= 80) scoreDistribution[1].count++;
        else if (s >= 70) scoreDistribution[2].count++;
        else if (s >= 60) scoreDistribution[3].count++;
        else scoreDistribution[4].count++;
      }
    });

    // 3. Trends over past 7 days from real application creation dates
    const trends: ActivityTrendPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const dateLabel = targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const targetDateStr = targetDate.toISOString().slice(0, 10);

      const appsCount = rawApps.filter((a: any) => {
        const d = (a.appliedAt || a.createdAt || "").slice(0, 10);
        return d === targetDateStr;
      }).length;

      const screenCount = rawApps.filter((a: any) => {
        const hasScreen = !!(a.latestScreening || (a.screeningResults && a.screeningResults.length > 0));
        const d = (a.appliedAt || a.createdAt || "").slice(0, 10);
        return hasScreen && d === targetDateStr;
      }).length;

      trends.push({
        date: dateLabel,
        applications: appsCount,
        screenings: screenCount,
      });
    }

    // 4. Recent applications (latest 5)
    const recentApplications: RecentApplication[] = rawApps.slice(0, 5).map((app: any) => {
      const rawScore =
        app.latestScreening?.overallScore ??
        app.screeningResults?.[0]?.overallScore ??
        app.matchScore ??
        0;
      const matchScore = Math.round(Number(rawScore));

      let status: "SCREENED" | "STRONG_MATCH" | "UNDER_REVIEW" | "PENDING" = "PENDING";
      if (matchScore >= 85) {
        status = "STRONG_MATCH";
      } else if (matchScore > 0 || app.status === "SCREENED") {
        status = "SCREENED";
      } else if (app.status === "REVIEWED" || app.status === "SHORTLISTED") {
        status = "UNDER_REVIEW";
      }

      const appliedAt = app.appliedAt || app.createdAt || new Date().toISOString();
      const msAgo = Date.now() - new Date(appliedAt).getTime();
      const minsAgo = Math.max(1, Math.floor(msAgo / (1000 * 60)));
      let timeAgo = `${minsAgo}m ago`;
      if (minsAgo >= 60 * 24) timeAgo = `${Math.floor(minsAgo / (60 * 24))}d ago`;
      else if (minsAgo >= 60) timeAgo = `${Math.floor(minsAgo / 60)}h ago`;

      return {
        id: app.id,
        candidateId: app.candidateId || app.candidate?.id || "",
        candidateName: app.candidateName || app.candidate?.name || app.candidate?.fullName || "Candidate",
        jobId: app.jobId || app.job?.id || "",
        jobTitle: app.jobTitle || app.job?.title || "Job Position",
        matchScore,
        status,
        appliedAt,
        timeAgo,
      };
    });

    return {
      trends,
      screeningDistribution,
      scoreDistribution,
      recentApplications,
    };
  },

  async getScreeningReport(query?: { jobId?: string; startDate?: string; endDate?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (query?.jobId) params.append("jobId", query.jobId);
    if (query?.startDate) params.append("startDate", query.startDate);
    if (query?.endDate) params.append("endDate", query.endDate);
    const qs = params.toString();
    return apiClient<any>(`/reports/screening${qs ? `?${qs}` : ""}`);
  },

  async getJobReport(query?: { status?: string }): Promise<any> {
    const qs = query?.status ? `?status=${query.status}` : "";
    return apiClient<any>(`/reports/jobs${qs}`);
  },

  async getCandidateReport(): Promise<any> {
    return apiClient<any>("/reports/candidates");
  },
};
