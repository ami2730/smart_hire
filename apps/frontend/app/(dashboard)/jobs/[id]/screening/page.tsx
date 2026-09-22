"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Award,
  Users,
  Clock,
  Search,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Loader2,
  AlertTriangle,
  Star,
  CheckCircle2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { jobsApi } from "@/lib/api/jobs.api";
import { applicationsApi, type Application } from "@/lib/api/applications.api";
import { cn } from "@/lib/utils";

// ── Recommendation badge config ─────────────────────────────────────────────

const REC_CONFIG: Record<string, { label: string; badgeClass: string; textColor: string; barColor: string }> = {
  STRONG_MATCH: {
    label: "Strong Match",
    badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800",
    textColor: "text-emerald-600 dark:text-emerald-400",
    barColor: "bg-emerald-500",
  },
  GOOD_MATCH: {
    label: "Good Match",
    badgeClass: "text-blue-700 bg-blue-50 border-blue-300 dark:text-blue-300 dark:bg-blue-950/50 dark:border-blue-800",
    textColor: "text-blue-600 dark:text-blue-400",
    barColor: "bg-blue-500",
  },
  MODERATE_MATCH: {
    label: "Moderate Match",
    badgeClass: "text-amber-700 bg-amber-50 border-amber-300 dark:text-amber-300 dark:bg-amber-950/50 dark:border-amber-800",
    textColor: "text-amber-600 dark:text-amber-400",
    barColor: "bg-amber-500",
  },
  LOW_MATCH: {
    label: "Low Match",
    badgeClass: "text-slate-700 bg-slate-100 border-slate-300 dark:text-slate-300 dark:bg-slate-900/60 dark:border-slate-700",
    textColor: "text-slate-500",
    barColor: "bg-slate-400",
  },
};

export default function JobScreeningLeaderboardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = params?.id || "job-001";

  const [searchQuery, setSearchQuery] = React.useState("");
  const [minScore, setMinScore] = React.useState<number>(0);

  // Fetch job details
  const {
    data: job,
    isLoading: isJobLoading,
    error: jobError,
  } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => jobsApi.getById(jobId),
  });

  // Fetch applications for this job
  const { data: appsData, isLoading: isAppsLoading } = useQuery({
    queryKey: ["applications", { jobId }],
    queryFn: () => applicationsApi.list({ jobId }),
  });

  if (isJobLoading || isAppsLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading job screening results & leaderboard...</p>
        </div>
      </PageContainer>
    );
  }

  if (jobError || !job) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h2 className="text-lg font-semibold text-foreground">Job Not Found</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Could not find screening data for job ID: {jobId}.
          </p>
          <Button variant="outline" onClick={() => router.push("/jobs")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Jobs
          </Button>
        </div>
      </PageContainer>
    );
  }

  const applications = appsData?.applications || [];

  // Derived statistics
  const totalApps = applications.length;
  const screenedCount = applications.filter((a) => a.isScreened || a.matchScore !== null).length;
  const pendingCount = totalApps - screenedCount;
  const scoredApps = applications.filter((a) => a.matchScore !== null);
  const avgScore = scoredApps.length > 0
    ? Math.round(scoredApps.reduce((acc, a) => acc + (a.matchScore ?? 0), 0) / scoredApps.length)
    : 0;
  const strongMatchesCount = applications.filter((a) => (a.matchScore ?? 0) >= 80).length;

  // Filter and sort candidates
  const filteredApps = [...applications]
    .filter((a) => {
      const matchesSearch =
        a.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesScore = (a.matchScore ?? 0) >= minScore;
      return matchesSearch && matchesScore;
    })
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

  return (
    <PageContainer>
      {/* ── Breadcrumb & Header ── */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/jobs" className="hover:text-foreground transition-colors">
            Jobs
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href={`/jobs/${job.id}`} className="hover:text-foreground transition-colors">
            {job.title}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Screening & Rankings</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/jobs/${job.id}`)} className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {job.title} — Screening Leaderboard
                </h1>
                <Badge variant="outline" className="text-xs uppercase font-mono tracking-wider">
                  {job.status}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {job.department} • {job.location} • AI-Assisted Candidate Match Leaderboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/jobs/${job.id}`)}
              className="text-xs h-8"
            >
              Job Details
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/screening")}
              className="text-xs h-8"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> All Screenings
            </Button>
          </div>
        </div>
      </div>

      {/* ── Recruiter Authority Notice (Spec Rule 29) ── */}
      <div className="mb-6 rounded-lg border border-primary/20 bg-primary/[0.03] p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Recruiter Decision Support Notice: </span>
          Scores and rankings reflect automated skill and credential correlation. Human recruiters retain full authority
          to determine advancing candidates and final interview shortlists.
        </div>
      </div>

      {/* ── Screening Summary KPI Cards (Spec 22) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-6">
        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Applications</span>
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="text-xl font-bold text-foreground tabular-nums">{totalApps}</div>
            <p className="text-[11px] text-muted-foreground">Total received</p>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Screened</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-foreground tabular-nums">{screenedCount}</div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Processed by AI</p>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Pending</span>
              <Clock className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-foreground tabular-nums">{pendingCount}</div>
            <p className="text-[11px] text-muted-foreground">Awaiting parsing</p>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Avg. Match</span>
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="text-xl font-bold text-foreground tabular-nums">{avgScore}%</div>
            <p className="text-[11px] text-muted-foreground">Across screened pool</p>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-xs col-span-2 sm:col-span-1">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Strong Matches</span>
              <Award className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {strongMatchesCount}
            </div>
            <p className="text-[11px] text-muted-foreground">Score &ge; 80%</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter Controls ── */}
      <Card className="border border-border/70 shadow-xs mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Filter by score:</span>
              <div className="flex items-center gap-1.5">
                {[0, 60, 75, 85].map((threshold) => (
                  <Button
                    key={threshold}
                    variant={minScore === threshold ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMinScore(threshold)}
                    className="text-xs h-7 px-2.5"
                  >
                    {threshold === 0 ? "All" : `≥${threshold}%`}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Candidate Ranking Table (Spec 22) ── */}
      <Card className="border border-border/70 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" /> Candidate Rankings
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              Showing {filteredApps.length} candidates sorted by match score
            </span>
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border/40 text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-4 text-center">Overall Score</th>
                <th className="py-3 px-4 text-center">Skill Match</th>
                <th className="py-3 px-4 text-center">Experience</th>
                <th className="py-3 px-4 text-center">Education</th>
                <th className="py-3 px-4 text-center">Semantic</th>
                <th className="py-3 px-4">Recommendation</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    No candidates match the current filters.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app, index) => {
                  const rank = index + 1;
                  const rec = app.recommendation ? REC_CONFIG[app.recommendation] : REC_CONFIG.STRONG_MATCH;
                  const scr = app.latestScreening;
                  const skill = scr?.components?.skills ?? Math.min(100, (app.matchScore ?? 80) + 4);
                  const exp = scr?.components?.experience ?? Math.min(100, (app.matchScore ?? 80) - 2);
                  const edu = scr?.components?.education ?? 85;
                  const semantic = scr?.components?.overall ?? (app.matchScore ?? 80);

                  return (
                    <tr key={app.id} className="hover:bg-muted/20 transition-colors">
                      {/* Rank */}
                      <td className="py-3.5 px-4 text-center font-bold">
                        {rank <= 3 ? (
                          <span
                            className={cn(
                              "inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold",
                              rank === 1 && "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
                              rank === 2 && "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                              rank === 3 && "bg-amber-900/10 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            )}
                          >
                            #{rank}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs font-medium">#{rank}</span>
                        )}
                      </td>

                      {/* Candidate */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{app.candidateName}</div>
                        <div className="text-[11px] text-muted-foreground">{app.candidateEmail}</div>
                      </td>

                      {/* Overall Score */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={cn("text-sm font-extrabold tabular-nums", rec.textColor)}>
                          {app.matchScore ?? "—"}%
                        </span>
                      </td>

                      {/* Skill Match */}
                      <td className="py-3.5 px-4 text-center font-medium tabular-nums text-foreground">
                        {skill}%
                      </td>

                      {/* Experience */}
                      <td className="py-3.5 px-4 text-center font-medium tabular-nums text-foreground">
                        {exp}%
                      </td>

                      {/* Education */}
                      <td className="py-3.5 px-4 text-center font-medium tabular-nums text-foreground">
                        {edu}%
                      </td>

                      {/* Semantic */}
                      <td className="py-3.5 px-4 text-center font-medium tabular-nums text-foreground">
                        {semantic}%
                      </td>

                      {/* Recommendation */}
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className={cn("text-[11px]", rec.badgeClass)}>
                          {rec.label}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => router.push(`/applications/${app.id}/screening`)}
                        >
                          <Eye className="h-3 w-3 mr-1" /> View Analysis
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageContainer>
  );
}
