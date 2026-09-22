"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Users,
  FileText,
  Sparkles,
  TrendingUp,
  Plus,
  ShieldCheck,
  ArrowRight,
  BarChart3,
  PieChart,
  LineChart,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { ScreeningDistributionChart } from "@/components/dashboard/screening-distribution-chart";
import { ScoreDistributionChart } from "@/components/dashboard/score-distribution-chart";
import { RecentApplications } from "@/components/dashboard/recent-applications";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { reportsApi } from "@/lib/api/reports.api";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { ApplicantDashboard } from "@/components/dashboard/applicant-dashboard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

function RecruiterDashboard() {
  const { user } = useAuth();
  const [activeChartTab, setActiveChartTab] = React.useState<"trends" | "recommendations" | "scores">("trends");

  const {
    data: overview,
    isLoading: isOverviewLoading,
    isError: isOverviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => reportsApi.getOverview(),
  });

  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    isError: isAnalyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ["dashboard-analytics"],
    queryFn: () => reportsApi.getDashboardAnalytics(),
  });

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  // ── These useMemo hooks MUST be above any early returns (Rules of Hooks) ──
  const avgDailyApps = React.useMemo(() => {
    if (!analytics?.trends || analytics.trends.length === 0) return 0;
    const total = analytics.trends.reduce((sum, t) => sum + t.applications, 0);
    return Math.round(total / analytics.trends.length);
  }, [analytics?.trends]);

  const qualifiedPercentage = React.useMemo(() => {
    if (!analytics?.screeningDistribution || analytics.screeningDistribution.length === 0) return 0;
    const strong = analytics.screeningDistribution.find((d) => d.name.includes("Strong"))?.count || 0;
    const good = analytics.screeningDistribution.find((d) => d.name.includes("Good"))?.count || 0;
    const total = analytics.screeningDistribution.reduce((sum, d) => sum + d.count, 0);
    return total > 0 ? Math.round(((strong + good) / total) * 100) : 0;
  }, [analytics?.screeningDistribution]);

  const recruiterName = user?.name ? user.name.split(" ")[0] : "Recruiter";

  if (isOverviewLoading || isAnalyticsLoading) {
    return <DashboardSkeleton />;
  }

  if (isOverviewError || isAnalyticsError) {
    return (
      <PageContainer>
        <ErrorState
          title="Unable to load recruitment metrics"
          message="We encountered an issue connecting to the reporting services. Please try again."
          onRetry={() => {
            refetchOverview();
            refetchAnalytics();
          }}
        />
      </PageContainer>
    );
  }

  const kpis = [
    {
      title: "Total Jobs",
      value: overview?.totalJobs ?? 0,
      change: overview?.totalJobs ? `${overview.totalJobs} posted` : "No jobs posted",
      trend: "neutral" as const,
      icon: Briefcase,
      description: "Your created positions",
    },
    {
      title: "Active Jobs",
      value: overview?.activeJobs ?? 0,
      change: overview?.activeJobs ? `${overview.activeJobs} published` : "None active",
      trend: "up" as const,
      icon: Briefcase,
      description: "Accepting candidate resumes",
    },
    {
      title: "Total Candidates",
      value: overview?.totalCandidates ?? 0,
      change: overview?.totalCandidates ? `${overview.totalCandidates} in pool` : "No applicants yet",
      trend: "up" as const,
      icon: Users,
      description: "Applied to your jobs",
    },
    {
      title: "Applications",
      value: overview?.totalApplications ?? 0,
      change: overview?.totalApplications ? `${overview.totalApplications} total` : "0 applications",
      trend: "up" as const,
      icon: FileText,
      description: "Your recruitment pipeline",
    },
    {
      title: "Screened Candidates",
      value: overview?.totalScreenings ?? 0,
      change:
        overview?.totalApplications && overview.totalApplications > 0
          ? `${Math.round(((overview?.totalScreenings ?? 0) / overview.totalApplications) * 100)}% completion rate`
          : "Awaiting screening",
      trend: "up" as const,
      icon: Sparkles,
      description: "Evaluated by AI Engine",
    },
    {
      title: "Average Match Score",
      value: overview?.averageMatchScore ? `${overview.averageMatchScore}%` : "0%",
      change: overview?.totalScreenings ? `${overview.totalScreenings} evaluated` : "No evaluations",
      trend: "up" as const,
      icon: TrendingUp,
      description: "Across your active roles",
    },
  ];

  // avgDailyApps and qualifiedPercentage are defined above the early returns

  return (
    <PageContainer
      title={`${greeting}, ${recruiterName}`}
      subtitle="Here is an overview of your recruitment pipeline and candidate screening activity."
      actions={
        <Link href="/jobs/new">
          <Button size="sm" className="gap-1.5 font-medium shadow-xs">
            <Plus className="h-4 w-4" />
            <span>Create Job</span>
          </Button>
        </Link>
      }
    >
      {/* AI Decision Support Notice */}
      <div className="flex items-start sm:items-center justify-between gap-3 rounded-lg border border-border/70 bg-card p-3.5 shadow-xs">
        <div className="flex items-start sm:items-center gap-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong className="font-semibold text-foreground">Decision Support Note:</strong>{" "}
            AI screening provides recommendations to assist recruiter review. Final hiring decisions remain with the recruiter.
          </span>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-mono shrink-0">
          AI Engine Online
        </Badge>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            change={kpi.change}
            trend={kpi.trend}
            icon={kpi.icon}
            description={kpi.description}
          />
        ))}
      </div>

      {/* Main Analytics & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Recharts Analytics Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
            <div>
              <CardTitle className="text-base font-semibold">Recruitment Analytics</CardTitle>
              <CardDescription className="text-xs">
                Candidate screening trends, distribution, and match quality across your positions.
              </CardDescription>
            </div>

            {/* Chart Mode Selector */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/50 text-xs">
              <button
                onClick={() => setActiveChartTab("trends")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium",
                  activeChartTab === "trends"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LineChart className="h-3.5 w-3.5" />
                <span>Trends</span>
              </button>
              <button
                onClick={() => setActiveChartTab("recommendations")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium",
                  activeChartTab === "recommendations"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <PieChart className="h-3.5 w-3.5" />
                <span>Matches</span>
              </button>
              <button
                onClick={() => setActiveChartTab("scores")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium",
                  activeChartTab === "scores"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Scores</span>
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {activeChartTab === "trends" && analytics?.trends && (
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Volume Over Past 7 Days</span>
                  <span className="font-medium text-foreground">
                    Avg {avgDailyApps} / day
                  </span>
                </div>
                <ActivityChart data={analytics.trends} />
              </div>
            )}

            {activeChartTab === "recommendations" && analytics?.screeningDistribution && (
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Candidate Recommendation Tiers</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {qualifiedPercentage}% Qualified / Good+
                  </span>
                </div>
                <ScreeningDistributionChart data={analytics.screeningDistribution} />
              </div>
            )}

            {activeChartTab === "scores" && analytics?.scoreDistribution && (
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Candidate Score Distribution</span>
                  <span className="font-medium text-foreground">
                    Mean Score: {overview?.averageMatchScore ? `${overview.averageMatchScore}%` : "0%"}
                  </span>
                </div>
                <ScoreDistributionChart data={analytics.scoreDistribution} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Applications Card */}
        <Card className="lg:col-span-1 flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
              <div>
                <CardTitle className="text-base font-semibold">Recent Applications</CardTitle>
                <CardDescription className="text-xs">
                  Latest screened candidates
                </CardDescription>
              </div>
              <Link
                href="/applications"
                className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
              >
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {analytics?.recentApplications && (
                <RecentApplications applications={analytics.recentApplications} />
              )}
            </CardContent>
          </div>

          <div className="p-3 border-t border-border/40 bg-muted/20 rounded-b-xl flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Synced with Node.js Express API</span>
            <Link
              href="/screening"
              className="text-primary hover:underline font-medium flex items-center gap-0.5"
            >
              <span>Screening Engine</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (user?.role === "APPLICANT") {
    return (
      <PageContainer
        title="Applicant Dashboard"
        subtitle="Manage your profile, applications, and job opportunities."
      >
        <ApplicantDashboard />
      </PageContainer>
    );
  }

  if (user?.role === "ADMIN") {
    return (
      <PageContainer
        title="Admin Control Center"
        subtitle="System governance, user account management, and recruitment throughput."
      >
        <AdminDashboard />
      </PageContainer>
    );
  }

  return <RecruiterDashboard />;
}
