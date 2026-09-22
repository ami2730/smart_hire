"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Zap,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  TrendingUp,
  BarChart3,
  ShieldCheck,
  BookOpen,
  Award,
  Target,
  ArrowRight,
  Briefcase,
  Eye,
  ChevronRight,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { applicationsApi, type Application, type ScreeningResult } from "@/lib/api/applications.api";
import { jobsApi } from "@/lib/api/jobs.api";
import { useAuth } from "@/lib/auth/auth-context";

// ── Score Component ─────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const size = 80;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const angle = Math.min(score / 100, 1);
  const dashOffset = circumference - angle * circumference;

  const color =
    score >= 85 ? "#10b981" : score >= 70 ? "#3b82f6" : score >= 55 ? "#f59e0b" : "#94a3b8";
  const label =
    score >= 85
      ? "Strong Match"
      : score >= 70
        ? "Good Match"
        : score >= 55
          ? "Moderate"
          : "Low Match";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted/30"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold tabular-nums" style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-semibold" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

// ── Component Score Bar ─────────────────────────────────────────────────────

function ComponentScoreBar({
  label,
  score,
  icon: Icon,
}: {
  label: string;
  score: number;
  icon: React.ElementType;
}) {
  const color =
    score >= 85
      ? "bg-emerald-500"
      : score >= 70
        ? "bg-blue-500"
        : score >= 55
          ? "bg-amber-500"
          : "bg-slate-400";
  const textColor =
    score >= 85
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 70
        ? "text-blue-600 dark:text-blue-400"
        : score >= 55
          ? "text-amber-600 dark:text-amber-400"
          : "text-slate-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className={cn("font-bold tabular-nums", textColor)}>{score}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ── Screening Card ──────────────────────────────────────────────────────────

function ScreeningCard({
  app,
  onScreen,
  isScreening,
}: {
  app: Application;
  onScreen: (id: string) => void;
  isScreening: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const screening = app.latestScreening;

  return (
    <Card
      className={cn(
        "transition-all",
        screening ? "border-border/60" : "border-dashed border-border/50"
      )}
    >
      <div
        className="flex items-center justify-between gap-4 p-4 cursor-pointer"
        onClick={() => screening && setExpanded((p) => !p)}
      >
        {/* Left: candidate */}
        <div className="flex items-center gap-3 min-w-0">
          {(() => {
            const candName = app.candidateName || (app as any).candidate?.name || "Candidate";
            const initials =
              candName
                .split(" ")
                .filter(Boolean)
                .map((n: string) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase() || "C";
            return (
              <>
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {candName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {app.jobTitle || (app as any).job?.title || "Job Position"}
                  </p>
                </div>
              </>
            );
          })()}
        </div>

        {/* Right: score or action */}
        <div className="flex items-center gap-3 shrink-0">
          {isScreening ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Evaluating…</span>
            </div>
          ) : screening ? (
            <>
              <ScoreGauge score={screening.matchScore} />
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  expanded && "rotate-180"
                )}
              />
            </>
          ) : (
            <Button
              size="sm"
              className="gap-1.5 text-xs font-medium shadow-xs"
              onClick={(e) => {
                e.stopPropagation();
                onScreen(app.id);
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Run AI Screening
            </Button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && screening && (
        <div className="border-t border-border/40 p-4 space-y-4">
          {/* Summary */}
          <div className="rounded-lg bg-muted/30 border border-border/40 p-3">
            <p className="text-xs text-foreground/80 leading-relaxed italic">
              "{screening.summaryText}"
            </p>
          </div>

          {/* Component scores */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground">
              Score Breakdown
            </p>
            {screening.components.skills !== undefined && (
              <ComponentScoreBar
                label="Skills Match"
                score={Math.round(screening.components.skills)}
                icon={Zap}
              />
            )}
            {screening.components.experience !== undefined && (
              <ComponentScoreBar
                label="Experience"
                score={Math.round(screening.components.experience)}
                icon={Award}
              />
            )}
            {screening.components.education !== undefined && (
              <ComponentScoreBar
                label="Education"
                score={Math.round(screening.components.education)}
                icon={BookOpen}
              />
            )}
          </div>

          {/* Skills match/miss */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Matching Skills
              </p>
              <div className="flex flex-wrap gap-1">
                {screening.matchingSkills.map((s) => (
                  <span
                    key={s}
                    className="rounded-md bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400"
                  >
                    {s}
                  </span>
                ))}
                {screening.matchingSkills.length === 0 && (
                  <span className="text-[10px] text-muted-foreground">None</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Missing Skills
              </p>
              <div className="flex flex-wrap gap-1">
                {screening.missingSkills.map((s) => (
                  <span
                    key={s}
                    className="rounded-md bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400"
                  >
                    {s}
                  </span>
                ))}
                {screening.missingSkills.length === 0 && (
                  <span className="text-[10px] text-muted-foreground">None</span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border/40 flex justify-end">
            <Link href={`/applications/${app.id}/screening`} onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                <Eye className="h-3 w-3 text-primary" /> View Deep Dive Analysis
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ScreeningPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeScreeningId, setActiveScreeningId] = React.useState<string | null>(null);
  const [jobFilter, setJobFilter] = React.useState<string>("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["applications-screening", jobFilter],
    queryFn: () =>
      applicationsApi.list({
        jobId: jobFilter !== "ALL" ? jobFilter : undefined,
        limit: 50,
      }),
    enabled: user?.role !== "APPLICANT",
  });

  const { data: jobsData } = useQuery({
    queryKey: ["jobs-for-screening"],
    queryFn: () => jobsApi.list({ status: "ACTIVE", limit: 20 }),
    enabled: user?.role !== "APPLICANT",
  });

  const screenMutation = useMutation({
    mutationFn: (id: string) => applicationsApi.screen(id),
    onMutate: (id) => setActiveScreeningId(id),
    onSettled: () => {
      setActiveScreeningId(null);
      queryClient.invalidateQueries({ queryKey: ["applications-screening"] });
    },
  });

  if (user?.role === "APPLICANT") {
    return (
      <PageContainer title="Access Restricted">
        <Card>
          <CardContent className="py-20 text-center space-y-3">
            <ShieldCheck className="h-10 w-10 text-primary mx-auto" />
            <h3 className="text-base font-semibold text-foreground">Access Restricted</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Candidate screening workflows and batch AI evaluations are reserved for recruiters and administrators.
            </p>
            <Link href="/dashboard" className="inline-block mt-2">
              <Button size="sm">Return to Applicant Portal</Button>
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const applications = data?.applications ?? [];
  const screened = applications.filter((a) => a.isScreened);
  const unscreened = applications.filter((a) => !a.isScreened);
  const jobs = jobsData?.jobs ?? [];

  const strongMatches = screened.filter((a) => a.recommendation === "STRONG_MATCH").length;
  const avgScore =
    screened.length > 0
      ? Math.round(screened.reduce((s, a) => s + (a.matchScore ?? 0), 0) / screened.length)
      : 0;

  return (
    <PageContainer
      title="AI Screening Engine"
      subtitle="Run AI-assisted candidate evaluations against job requirements. Scores are recommendations only."
    >
      {/* AI Safety Notice */}
      <div className="flex items-start sm:items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5">
        <div className="flex items-start sm:items-center gap-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong className="font-semibold text-foreground">Recruiter Decision Authority:</strong>{" "}
            AI screening scores are decision support tools. All hiring decisions are made by the recruiter.
          </span>
        </div>
      </div>

      {/* Stats Row */}
      {applications.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Applications", value: applications.length, icon: BarChart3 },
            { label: "Screened", value: screened.length, icon: Sparkles },
            { label: "Strong Matches", value: strongMatches, icon: TrendingUp },
            { label: "Avg Score", value: `${avgScore}%`, icon: Target },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center text-center rounded-xl border border-border/60 bg-card p-4"
            >
              <stat.icon className="h-4 w-4 text-primary mb-1.5" />
              <span className="text-xl font-bold text-foreground">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground font-medium">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Jobs Requiring Screening (Spec 21) ── */}
      {jobs.length > 0 && (
        <Card className="border border-border/70 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" /> Active Job Vacancies Requiring Screening
            </CardTitle>
            <CardDescription className="text-xs">
              Recruitment pipelines with pending and processed AI evaluations
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/40 text-muted-foreground uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Job Title</th>
                  <th className="py-2.5 px-4 text-center">Applications</th>
                  <th className="py-2.5 px-4 text-center">Processed</th>
                  <th className="py-2.5 px-4 text-center">Pending</th>
                  <th className="py-2.5 px-4 text-center">Average Score</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {jobs.map((j) => {
                  const jobApps = applications.filter((a) => a.jobId === j.id);
                  const processedApps = jobApps.filter((a) => a.isScreened || a.matchScore !== null);
                  const pendingApps = jobApps.length - processedApps.length;
                  const scored = jobApps.filter((a) => a.matchScore !== null);
                  const avg = scored.length > 0 ? Math.round(scored.reduce((acc, a) => acc + (a.matchScore ?? 0), 0) / scored.length) : null;

                  return (
                    <tr key={j.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <Link href={`/jobs/${j.id}`} className="hover:text-primary transition-colors">
                          {j.title}
                        </Link>
                        <div className="text-[11px] text-muted-foreground font-normal">{j.department} • {j.location}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-medium tabular-nums">{jobApps.length}</td>
                      <td className="py-3 px-4 text-center font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {processedApps.length}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                        {pendingApps}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-foreground tabular-nums">
                        {avg !== null ? `${avg}%` : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/jobs/${j.id}/screening`}>
                          <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                            <Sparkles className="h-3 w-3 text-primary" /> View Screening
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Job filter */}
      {jobs.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setJobFilter("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer",
              jobFilter === "ALL"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            All Jobs
          </button>
          {jobs.map((job) => (
            <button
              key={job.id}
              onClick={() => setJobFilter(job.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                jobFilter === job.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {job.title}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="py-20 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No Applications to Screen</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Applications need to be submitted before AI screening can be performed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Unscreened section */}
          {unscreened.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Awaiting Screening
                  <span className="text-xs font-normal text-muted-foreground">
                    ({unscreened.length})
                  </span>
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  disabled={screenMutation.isPending}
                  onClick={() => {
                    if (unscreened[0] && !screenMutation.isPending) {
                      screenMutation.mutate(unscreened[0].id);
                    }
                  }}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Screen Next
                </Button>
              </div>
              {unscreened.map((app) => (
                <ScreeningCard
                  key={app.id}
                  app={app}
                  onScreen={(id) => screenMutation.mutate(id)}
                  isScreening={activeScreeningId === app.id}
                />
              ))}
            </div>
          )}

          {/* Screened section */}
          {screened.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Completed Evaluations
                <span className="text-xs font-normal text-muted-foreground">
                  ({screened.length})
                </span>
              </h3>
              {screened
                .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
                .map((app) => (
                  <ScreeningCard
                    key={app.id}
                    app={app}
                    onScreen={(id) => screenMutation.mutate(id)}
                    isScreening={activeScreeningId === app.id}
                  />
                ))}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
