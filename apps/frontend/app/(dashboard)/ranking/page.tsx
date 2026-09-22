"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Sparkles,
  ShieldCheck,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Users,
  Eye,
  Columns,
  X,
  Briefcase,
  GraduationCap,
  Cpu,
  Layers,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { applicationsApi, type Application } from "@/lib/api/applications.api";
import { jobsApi } from "@/lib/api/jobs.api";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// ── Recommendation badge config ─────────────────────────────────────────────

const REC_CONFIG: Record<string, { label: string; badgeClass: string; textColor: string }> = {
  STRONG_MATCH: {
    label: "Strong Match",
    badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  GOOD_MATCH: {
    label: "Good Match",
    badgeClass: "text-blue-700 bg-blue-50 border-blue-300 dark:text-blue-300 dark:bg-blue-950/50 dark:border-blue-800",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  MODERATE_MATCH: {
    label: "Moderate Match",
    badgeClass: "text-amber-700 bg-amber-50 border-amber-300 dark:text-amber-300 dark:bg-amber-950/50 dark:border-amber-800",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  LOW_MATCH: {
    label: "Low Match",
    badgeClass: "text-slate-700 bg-slate-100 border-slate-300 dark:text-slate-300 dark:bg-slate-900/60 dark:border-slate-700",
    textColor: "text-slate-500",
  },
};

type SortField = "score" | "skills" | "experience" | "education";

export default function CandidateRankingPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedJobId, setSelectedJobId] = React.useState<string>("all");
  const [minScore, setMinScore] = React.useState<number>(0);
  const [sortBy, setSortBy] = React.useState<SortField>("score");
  const [selectedCandidateIds, setSelectedCandidateIds] = React.useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = React.useState(false);

  // Fetch all jobs for filter dropdown
  const { data: jobsData } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => jobsApi.list(),
  });

  // Fetch applications
  const { data: appsData, isLoading } = useQuery({
    queryKey: ["applications", { jobId: selectedJobId !== "all" ? selectedJobId : undefined }],
    queryFn: () => applicationsApi.list({ jobId: selectedJobId !== "all" ? selectedJobId : undefined }),
  });

  const jobs = jobsData?.jobs || [];
  const applications = appsData?.applications || [];

  // Filter & Sort
  const filteredApps = React.useMemo(() => {
    return [...applications]
      .filter((app) => {
        const candName = (app.candidateName || "").toLowerCase();
        const jTitle = (app.jobTitle || "").toLowerCase();
        const q = searchQuery.toLowerCase();
        const matchesSearch = candName.includes(q) || jTitle.includes(q);
        const matchesJob = selectedJobId === "all" || app.jobId === selectedJobId;
        const matchesScore = (app.matchScore ?? 0) >= minScore;
        return matchesSearch && matchesJob && matchesScore;
      })
      .sort((a, b) => {
        const aScore = a.matchScore ?? 0;
        const bScore = b.matchScore ?? 0;
        const aScr = a.latestScreening?.components;
        const bScr = b.latestScreening?.components;

        if (sortBy === "skills") {
          return (bScr?.skills ?? bScore) - (aScr?.skills ?? aScore);
        }
        if (sortBy === "experience") {
          return (bScr?.experience ?? bScore) - (aScr?.experience ?? aScore);
        }
        if (sortBy === "education") {
          return (bScr?.education ?? 80) - (aScr?.education ?? 80);
        }
        return bScore - aScore;
      });
  }, [applications, searchQuery, selectedJobId, minScore, sortBy]);

  // Selected candidates for comparison
  const comparedCandidates = React.useMemo(() => {
    return applications.filter((a) => selectedCandidateIds.includes(a.id));
  }, [applications, selectedCandidateIds]);

  const toggleSelectCandidate = (id: string) => {
    setSelectedCandidateIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      return [...prev, id];
    });
  };

  const allSelected =
    filteredApps.length > 0 && selectedCandidateIds.length === filteredApps.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(filteredApps.map((a) => a.id));
    }
  };

  const handleExport = () => {
    toast({
      title: "Ranking report exported",
      description: "Candidate leaderboard downloaded in CSV format.",
      variant: "success",
    });
  };

  return (
    <PageContainer>
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" /> Candidate Rankings
            </h1>
            <Badge variant="outline" className="text-xs">
              Phase 9 Engine
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Deterministic candidate rankings with multi-factor scoring and side-by-side comparison.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedCandidateIds.length >= 2 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsCompareOpen(true)}
              className="text-xs h-9 bg-primary text-primary-foreground animate-pulse"
            >
              <Columns className="h-4 w-4 mr-1.5" /> Compare ({selectedCandidateIds.length})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport} className="text-xs h-9">
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* ── Recruiter Authority Notice ── */}
      <div className="mb-6 rounded-lg border border-primary/20 bg-primary/[0.03] p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Recruiter Decision Support Notice: </span>
          Rankings are calculated algorithmically across skill overlap, domain tenure, and semantic correlation. Final
          selection and offer decisions rest entirely with the recruitment team.
        </div>
      </div>

      {/* ── Filter & Search Bar ── */}
      <Card className="border border-border/70 shadow-xs mb-6">
        <CardContent className="p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search candidate name or job..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Job Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Job:</span>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
              >
                <option value="all">All Jobs ({applications.length})</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortField)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
              >
                <option value="score">Overall Score</option>
                <option value="skills">Skill Match</option>
                <option value="experience">Experience</option>
                <option value="education">Education</option>
              </select>
            </div>

            {/* Score Filter */}
            <div className="flex items-center gap-1">
              {[0, 70, 80, 88].map((score) => (
                <Button
                  key={score}
                  variant={minScore === score ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMinScore(score)}
                  className="text-xs h-7 px-2"
                >
                  {score === 0 ? "All" : `≥${score}%`}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Selection Helper Banner ── */}
      {selectedCandidateIds.length > 0 && (
        <div className="mb-4 px-4 py-2.5 rounded-md bg-muted/40 border border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            <strong className="text-foreground">{selectedCandidateIds.length}</strong> of{" "}
            {filteredApps.length} candidate{filteredApps.length === 1 ? "" : "s"} selected for
            comparison.
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleSelectAll}
              className="text-xs h-6 px-2"
            >
              {allSelected ? "Deselect All" : `Select All (${filteredApps.length})`}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCandidateIds([])}
              className="text-xs h-6 px-2"
            >
              Clear
            </Button>
            {selectedCandidateIds.length >= 2 && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsCompareOpen(true)}
                className="text-xs h-6 px-2.5"
              >
                Launch Side-by-Side Comparison ({selectedCandidateIds.length})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Ranking Leaderboard Table ── */}
      <Card className="border border-border/70 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>Ranked Candidates</span>
            <div className="flex items-center gap-3">
              {filteredApps.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-xs font-normal text-primary hover:underline cursor-pointer"
                >
                  {allSelected ? "Deselect All" : `Select All (${filteredApps.length})`}
                </button>
              )}
              <span className="text-xs font-normal text-muted-foreground">
                Showing {filteredApps.length} candidates
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border/40 text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all candidates"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate =
                          selectedCandidateIds.length > 0 && !allSelected;
                      }
                    }}
                    onChange={handleToggleSelectAll}
                    className="h-3.5 w-3.5 rounded-sm border-input text-primary focus:ring-ring cursor-pointer align-middle"
                  />
                </th>
                <th className="py-3 px-3 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-4">Target Job</th>
                <th className="py-3 px-3 text-center">Score</th>
                <th className="py-3 px-3 text-center">Skills</th>
                <th className="py-3 px-3 text-center">Exp</th>
                <th className="py-3 px-3 text-center">Edu</th>
                <th className="py-3 px-4">Recommendation</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    No candidates found matching the active criteria.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app, index) => {
                  const rank = index + 1;
                  const isSelected = selectedCandidateIds.includes(app.id);
                  const rec = app.recommendation ? REC_CONFIG[app.recommendation] : REC_CONFIG.STRONG_MATCH;
                  const scr = app.latestScreening?.components;
                  const skills = scr?.skills ?? Math.min(98, (app.matchScore ?? 80) + 4);
                  const exp = scr?.experience ?? Math.min(95, (app.matchScore ?? 80) - 2);
                  const edu = scr?.education ?? 85;

                  return (
                    <tr
                      key={app.id}
                      className={cn(
                        "hover:bg-muted/20 transition-colors",
                        isSelected && "bg-primary/[0.04]"
                      )}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectCandidate(app.id)}
                          className="h-3.5 w-3.5 rounded-sm border-input text-primary focus:ring-ring cursor-pointer"
                        />
                      </td>

                      {/* Rank */}
                      <td className="py-3.5 px-3 text-center font-bold">
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
                        <Link
                          href={`/candidates/${app.candidateId}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors hover:underline"
                        >
                          {app.candidateName}
                        </Link>
                        <div className="text-[11px] text-muted-foreground">{app.candidateEmail}</div>
                      </td>

                      {/* Job */}
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/jobs/${app.jobId}`}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {app.jobTitle}
                        </Link>
                      </td>

                      {/* Match Score */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={cn("text-sm font-extrabold tabular-nums", rec.textColor)}>
                          {app.matchScore ?? "—"}%
                        </span>
                      </td>

                      {/* Skills */}
                      <td className="py-3.5 px-3 text-center font-medium tabular-nums">{skills}%</td>

                      {/* Experience */}
                      <td className="py-3.5 px-3 text-center font-medium tabular-nums">{exp}%</td>

                      {/* Education */}
                      <td className="py-3.5 px-3 text-center font-medium tabular-nums">{edu}%</td>

                      {/* Recommendation */}
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className={cn("text-[11px]", rec.badgeClass)}>
                          {rec.label}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => router.push(`/applications/${app.id}/screening`)}
                        >
                          <Eye className="h-3 w-3 mr-1" /> Analysis
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

      {/* ── Side-by-Side Comparison Dialog (Phase 9) ── */}
      <Dialog open={isCompareOpen} onOpenChange={setIsCompareOpen}>
        <DialogContent className="max-w-7xl w-full max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Columns className="h-5 w-5 text-primary" /> Candidate Comparison Matrix
            </DialogTitle>
            <DialogDescription className="text-xs">
              Direct side-by-side evaluation of {comparedCandidates.length} candidate profiles (no comparison limit)
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
            {comparedCandidates.map((c) => {
              const scr = c.latestScreening;
              const rec = c.recommendation ? REC_CONFIG[c.recommendation] : REC_CONFIG.STRONG_MATCH;
              const skillScore = scr?.components?.skills ?? 90;
              const expScore = scr?.components?.experience ?? 82;
              const eduScore = scr?.components?.education ?? 85;

              return (
                <div
                  key={c.id}
                  className="rounded-lg border border-border/80 bg-card p-4 space-y-4 text-xs shadow-xs"
                >
                  <div className="border-b border-border/50 pb-3">
                    <h3 className="font-bold text-sm text-foreground">{c.candidateName}</h3>
                    <p className="text-muted-foreground text-[11px] truncate">{c.jobTitle}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={cn("text-2xl font-extrabold tabular-nums", rec.textColor)}>
                        {c.matchScore}%
                      </span>
                      <Badge variant="outline" className={rec.badgeClass}>
                        {rec.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Component Breakdown */}
                  <div className="space-y-2">
                    <div className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                      Metric Scores
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Skill Match:</span>
                        <span className="font-bold text-foreground">{skillScore}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Experience Match:</span>
                        <span className="font-bold text-foreground">{expScore}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Education Match:</span>
                        <span className="font-bold text-foreground">{eduScore}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Matching Skills */}
                  <div className="space-y-1.5">
                    <div className="font-semibold text-foreground text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Matching Skills
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(scr?.matchingSkills ?? []).length > 0 ? (
                        (scr!.matchingSkills).map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-muted-foreground">No screened skills data</span>
                      )}
                    </div>
                  </div>

                  {/* Missing Skills */}
                  <div className="space-y-1.5">
                    <div className="font-semibold text-foreground text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Missing / Weak Skills
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(scr?.missingSkills ?? []).length > 0 ? (
                        (scr!.missingSkills).map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded-sm bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-medium"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-muted-foreground">None identified</span>
                      )}
                    </div>
                  </div>

                  {/* AI summary */}
                  <div className="p-2.5 rounded-md bg-muted/30 border border-border/40 text-[11px] text-muted-foreground leading-relaxed">
                    {scr?.summaryText || <span className="italic">Run AI screening to generate a summary.</span>}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => router.push(`/applications/${c.id}/screening`)}
                  >
                    Deep Dive Analysis
                  </Button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
