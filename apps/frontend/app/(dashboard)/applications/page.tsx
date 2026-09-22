"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Search,
  Sparkles,
  Clock,
  CheckCircle2,
  Star,
  AlertTriangle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Briefcase,
  Users,
  Loader2,
  BarChart3,
  TrendingUp,
  Eye,
  X,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  applicationsApi,
  type Application,
  type ApplicationStatus,
} from "@/lib/api/applications.api";
import { applicantApi, ApplicantApplication } from "@/lib/api/applicant.api";
import { jobsApi, type Job } from "@/lib/api/jobs.api";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/components/ui/toast";

// ── Status Configuration ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; className: string }
> = {
  SUBMITTED: {
    label: "Submitted",
    icon: FileText,
    className:
      "text-sky-600 bg-sky-50 border-sky-200 dark:text-sky-400 dark:bg-sky-950/30 dark:border-sky-900",
  },
  PENDING: {
    label: "Pending",
    icon: Clock,
    className:
      "text-slate-500 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/40 dark:border-slate-700",
  },
  APPLIED: {
    label: "Applied",
    icon: FileText,
    className:
      "text-sky-600 bg-sky-50 border-sky-200 dark:text-sky-400 dark:bg-sky-950/30 dark:border-sky-900",
  },
  SCREENING: {
    label: "Screening",
    icon: Sparkles,
    className:
      "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-900",
  },
  PROCESSING: {
    label: "Processing",
    icon: Sparkles,
    className:
      "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-900",
  },
  SCREENED: {
    label: "Screened",
    icon: Sparkles,
    className:
      "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-900",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    icon: AlertTriangle,
    className:
      "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-900",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    icon: Star,
    className:
      "text-violet-600 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-950/30 dark:border-violet-900",
  },
  REVIEWED: {
    label: "Reviewed",
    icon: Eye,
    className:
      "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/30 dark:border-purple-900",
  },
  INTERVIEW: {
    label: "Interview",
    icon: Users,
    className:
      "text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/30 dark:border-indigo-900",
  },
  INTERVIEWED: {
    label: "Interviewed",
    icon: Users,
    className:
      "text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/30 dark:border-indigo-900",
  },
  OFFERED: {
    label: "Offered",
    icon: CheckCircle2,
    className:
      "text-cyan-600 bg-cyan-50 border-cyan-200 dark:text-cyan-400 dark:bg-cyan-950/30 dark:border-cyan-900",
  },
  HIRED: {
    label: "Hired",
    icon: CheckCircle2,
    className:
      "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    className:
      "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    icon: XCircle,
    className:
      "text-slate-400 bg-slate-50 border-slate-200 dark:text-slate-500 dark:bg-slate-900/20 dark:border-slate-800",
  },
};

const DEFAULT_STATUS_CONFIG = {
  label: "Submitted",
  icon: FileText,
  className:
    "text-sky-600 bg-sky-50 border-sky-200 dark:text-sky-400 dark:bg-sky-950/30 dark:border-sky-900",
};

function getStatusConfig(status?: string) {
  if (!status) return DEFAULT_STATUS_CONFIG;
  return STATUS_CONFIG[status.toUpperCase()] || DEFAULT_STATUS_CONFIG;
}

const RECOMMENDATION_CONFIG: Record<
  string,
  { label: string; color: string; bgClass: string }
> = {
  STRONG_MATCH: {
    label: "Strong Match",
    color: "#10b981",
    bgClass: "text-emerald-600 dark:text-emerald-400",
  },
  GOOD_MATCH: {
    label: "Good Match",
    color: "#3b82f6",
    bgClass: "text-blue-600 dark:text-blue-400",
  },
  MODERATE_MATCH: {
    label: "Moderate",
    color: "#f59e0b",
    bgClass: "text-amber-600 dark:text-amber-400",
  },
  LOW_MATCH: {
    label: "Low Match",
    color: "#94a3b8",
    bgClass: "text-slate-500 dark:text-slate-400",
  },
};

// ── Score Bar ───────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const config =
    score >= 85
      ? { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" }
      : score >= 70
        ? { bar: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" }
        : score >= 55
          ? { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" }
          : { bar: "bg-slate-400", text: "text-slate-500" };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", config.bar)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn("text-xs font-bold tabular-nums shrink-0", config.text)}>
        {score}%
      </span>
    </div>
  );
}

// ── Application Row ─────────────────────────────────────────────────────────

function ApplicationRow({
  app,
  isSelected,
  onToggleSelect,
  onScreen,
}: {
  app: Application;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onScreen: (id: string) => void;
}) {
  const status = getStatusConfig(app.status);
  const StatusIcon = status.icon;
  const recConfig = app.recommendation ? RECOMMENDATION_CONFIG[app.recommendation] : null;

  const timeAgo = React.useMemo(() => {
    const diff = Date.now() - new Date(app.appliedAt).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "Just now";
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }, [app.appliedAt]);

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_3fr_2fr_2fr_auto] items-center gap-3 px-4 py-3.5 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors",
        isSelected && "bg-primary/[0.04]"
      )}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(app.id)}
          aria-label={`Select application for ${app.candidateName || "candidate"}`}
          className="h-3.5 w-3.5 rounded-sm border-input text-primary focus:ring-ring cursor-pointer align-middle"
        />
      </div>

      {/* Candidate + Job */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
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
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/candidates/${app.candidateId}`}
                    className="text-sm font-semibold text-foreground truncate hover:text-primary hover:underline transition-colors block"
                  >
                    {candName}
                  </Link>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <Briefcase className="h-3 w-3 shrink-0" />
                    {app.jobTitle || (app as any).job?.title || "Job Position"}
                  </p>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Status */}
      <div className="hidden sm:flex items-center">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
            status.className
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </span>
      </div>

      {/* Score */}
      <div className="hidden sm:block">
        {app.matchScore !== null && app.matchScore !== undefined ? (
          <div className="space-y-0.5">
            <ScoreBar score={app.matchScore} />
            {recConfig && (
              <p className={cn("text-[10px] font-medium", recConfig.bgClass)}>
                {recConfig.label}
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={() => onScreen(app.id)}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline cursor-pointer"
          >
            <Sparkles className="h-3 w-3" />
            Run AI Screen
          </button>
        )}
      </div>

      {/* Time + Action */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:block text-[10px] text-muted-foreground">{timeAgo}</span>
        {app.isScreened || app.matchScore !== null ? (
          <Link href={`/applications/${app.id}/screening`}>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs font-medium gap-1"
            >
              <Eye className="h-3 w-3 text-primary" />
              Analysis
            </Button>
          </Link>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs font-medium gap-1"
            onClick={() => onScreen(app.id)}
          >
            <Sparkles className="h-3 w-3" />
            Screen
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Pipeline Summary ────────────────────────────────────────────────────────

function PipelineSummary({ applications }: { applications: Application[] }) {
  const stages = [
    { label: "Pending", status: "PENDING" as ApplicationStatus },
    { label: "Screened", status: "SCREENED" as ApplicationStatus },
    { label: "Shortlisted", status: "SHORTLISTED" as ApplicationStatus },
    { label: "Interviewed", status: "INTERVIEWED" as ApplicationStatus },
    { label: "Hired", status: "HIRED" as ApplicationStatus },
  ];

  return (
    <div className="grid grid-cols-5 gap-2">
      {stages.map((stage, i) => {
        const count = applications.filter((a) => a.status === stage.status).length;
        const isLast = i === stages.length - 1;
        return (
          <div
            key={stage.status}
            className={cn(
              "flex flex-col items-center text-center p-3 rounded-xl border",
              isLast
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20"
                : "border-border/60 bg-card"
            )}
          >
            <span
              className={cn(
                "text-xl font-bold tabular-nums",
                isLast
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-foreground"
              )}
            >
              {count}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Status Filter Tabs ──────────────────────────────────────────────────────

const FILTER_TABS: { label: string; value: string }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Screened", value: "SCREENED" },
  { label: "Shortlisted", value: "SHORTLISTED" },
  { label: "Hired", value: "HIRED" },
];

function ApplicantApplicationsView() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get("jobId");

  const { data: rawApplications = [], isLoading } = useQuery({
    queryKey: ["applicant", "applications-list"],
    queryFn: () => applicantApi.getApplications(),
  });

  const applications = React.useMemo(() => {
    if (!jobIdParam) return rawApplications;
    return rawApplications.filter((a: ApplicantApplication) => a.job?.id === jobIdParam);
  }, [rawApplications, jobIdParam]);

  const withdrawMutation = useMutation({
    mutationFn: (id: string) => applicantApi.withdrawApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant", "applications-list"] });
      toast({
        title: "Application Withdrawn",
        description: "Your application has been withdrawn.",
        variant: "info",
      });
    },
    onError: () => {
      toast({ title: "Failed to withdraw", variant: "error" });
    },
  });

  return (
    <PageContainer
      title="My Applications"
      subtitle="Track the status of your submitted job applications and candidate evaluations."
    >
      {jobIdParam && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-primary mb-4">
          <span>
            Filtering applications for job:{" "}
            <strong>{applications[0]?.job?.title || "Selected Job"}</strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/applications")}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <X className="h-3 w-3" />
            Clear Filter
          </Button>
        </div>
      )}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center text-xs text-muted-foreground">
            Loading your applications...
          </CardContent>
        </Card>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="py-20 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No applications yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              You haven't submitted any job applications yet. Browse published jobs to get started.
            </p>
            <Link href="/jobs" className="mt-4">
              <Button size="sm">Browse Job Openings</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden sm:grid grid-cols-[3fr_2fr_2fr_auto] gap-3 px-4 py-2.5 border-b border-border/60 bg-muted/20 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Job Position</span>
            <span>Date Applied</span>
            <span>Current Status</span>
            <span>Actions</span>
          </div>
          <CardContent className="p-0 divide-y divide-border/40">
            {applications.map((app: ApplicantApplication) => {
              const statusCfg = getStatusConfig(app.status);
              const StatusIcon = statusCfg.icon;
              const canWithdraw = app.status !== "WITHDRAWN" && app.status !== "REJECTED" && app.status !== "OFFERED";

              return (
                <div
                  key={app.id}
                  className="grid grid-cols-1 sm:grid-cols-[3fr_2fr_2fr_auto] items-center gap-3 p-4 hover:bg-muted/20 transition-colors"
                >
                  <div>
                    <Link
                      href={`/jobs/${app.job.id}`}
                      className="text-sm font-semibold text-foreground hover:text-primary hover:underline transition-colors block"
                    >
                      {app.job.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {app.job.location || "Remote"} · {app.job.employmentType || "Full-time"}
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {new Date(app.appliedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>

                  <div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold",
                        statusCfg.className
                      )}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusCfg.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/jobs/${app.job.id}`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        View Job
                      </Button>
                    </Link>
                    {canWithdraw && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={withdrawMutation.isPending}
                        onClick={() => withdrawMutation.mutate(app.id)}
                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                      >
                        Withdraw
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}

// ── Recruiter Applications View ──────────────────────────────────────────────

function RecruiterApplicationsView() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const jobIdFromUrl = searchParams.get("jobId") || "ALL";

  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [selectedJobId, setSelectedJobId] = React.useState(jobIdFromUrl);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [screeningId, setScreeningId] = React.useState<string | null>(null);
  const [selectedAppIds, setSelectedAppIds] = React.useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = React.useState(false);

  // Sync state if URL searchParams changes
  React.useEffect(() => {
    setSelectedJobId(searchParams.get("jobId") || "ALL");
  }, [searchParams]);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch list of jobs for the job filter dropdown
  const { data: jobsData } = useQuery({
    queryKey: ["jobs", "applications-filter"],
    queryFn: () => jobsApi.list({ limit: 100 }),
  });
  const jobs = jobsData?.jobs ?? [];
  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  const handleJobChange = (newJobId: string) => {
    setSelectedJobId(newJobId);
    setSelectedAppIds([]);
    const params = new URLSearchParams(searchParams.toString());
    if (newJobId === "ALL") {
      params.delete("jobId");
    } else {
      params.set("jobId", newJobId);
    }
    const query = params.toString();
    router.push(query ? `/applications?${query}` : "/applications");
  };

  const { data, isLoading } = useQuery({
    queryKey: ["applications", statusFilter, debouncedSearch, selectedJobId],
    queryFn: () =>
      applicationsApi.list({
        status:
          statusFilter !== "ALL" ? (statusFilter as ApplicationStatus) : undefined,
        search: debouncedSearch || undefined,
        jobId: selectedJobId !== "ALL" ? selectedJobId : undefined,
        limit: 50,
      }),
  });

  const screenMutation = useMutation({
    mutationFn: (id: string) => applicationsApi.screen(id),
    onMutate: (id) => setScreeningId(id),
    onSettled: () => {
      setScreeningId(null);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const rawApplications = data?.applications ?? [];
  // Client-side search filter for candidate name, email, or job title
  const applications = rawApplications.filter((app) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    const candName = (app.candidateName || "").toLowerCase();
    const candEmail = (app.candidateEmail || "").toLowerCase();
    const jTitle = (app.jobTitle || "").toLowerCase();
    return candName.includes(q) || candEmail.includes(q) || jTitle.includes(q);
  });
  const screened = applications.filter((a) => a.isScreened);
  const avgScore =
    screened.length > 0
      ? Math.round(
          screened.reduce((s, a) => s + (a.matchScore ?? 0), 0) / screened.length
        )
      : 0;

  const allSelected = applications.length > 0 && selectedAppIds.length === applications.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(applications.map((a) => a.id));
    }
  };

  const toggleSelectApp = (id: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkScreen = async () => {
    if (selectedAppIds.length === 0) return;
    setIsBulkProcessing(true);
    toast({
      title: "Bulk AI Screening Started",
      description: `Screening ${selectedAppIds.length} candidate applications...`,
      variant: "info",
    });

    let successCount = 0;
    for (const id of selectedAppIds) {
      try {
        await applicationsApi.screen(id);
        successCount++;
      } catch (e) {
        console.error("Error screening application", id, e);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["applications"] });
    setIsBulkProcessing(false);
    toast({
      title: "Bulk Screening Finished",
      description: `Successfully screened ${successCount} of ${selectedAppIds.length} applications.`,
      variant: "success",
    });
  };

  const handleBulkStatus = async (newStatus: ApplicationStatus) => {
    if (selectedAppIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      for (const id of selectedAppIds) {
        await applicationsApi.updateStatus(id, newStatus);
      }
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast({
        title: "Status Updated",
        description: `Updated ${selectedAppIds.length} applications to ${newStatus}.`,
        variant: "success",
      });
      setSelectedAppIds([]);
    } catch {
      toast({
        title: "Update Failed",
        description: "An error occurred while updating application statuses.",
        variant: "error",
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return (
    <PageContainer
      title="Applications"
      subtitle="Track candidate submissions, run AI screenings, and manage the hiring pipeline."
    >
      {/* Active Job Filter Banner */}
      {selectedJobId !== "ALL" && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground text-sm">
                  {selectedJob?.title || "Selected Job Position"}
                </span>
                {selectedJob?.department && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border/50">
                    {selectedJob.department}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Showing applications submitted for this specific job position.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/jobs/${selectedJobId}`}>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                View Job Details
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleJobChange("ALL")}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="h-3.5 w-3.5" />
              Clear Filter
            </Button>
          </div>
        </div>
      )}

      {/* Pipeline Summary */}
      {applications.length > 0 && (
        <PipelineSummary applications={applications} />
      )}

      {/* KPI row */}
      {screened.length > 0 && (
        <div className="flex items-center gap-6 text-sm py-2 border-y border-border/40">
          <div className="flex items-center gap-2 text-muted-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span>
              <strong className="text-foreground">{screened.length}</strong> / {applications.length} screened
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>
              Avg score:{" "}
              <strong className="text-foreground">{avgScore}%</strong>
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50 text-xs">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setSelectedAppIds([]);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer",
                  statusFilter === tab.value
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Job Filter Dropdown */}
          <div className="relative flex items-center">
            <Briefcase className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <select
              value={selectedJobId}
              onChange={(e) => handleJobChange(e.target.value)}
              aria-label="Filter applications by job"
              className={cn(
                "h-9 pl-8 pr-7 rounded-lg border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer max-w-[240px] truncate",
                selectedJobId !== "ALL"
                  ? "border-primary/40 bg-primary/5 text-primary font-semibold"
                  : "border-border/50 bg-background text-foreground hover:border-border"
              )}
            >
              <option value="ALL">All Jobs {jobs.length > 0 ? `(${jobs.length})` : ""}</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} {j.applicationCount !== undefined ? `(${j.applicationCount})` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div className="relative w-full lg:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search candidates or jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedAppIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5 text-xs shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              {selectedAppIds.length} of {applications.length} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px]"
              onClick={handleToggleSelectAll}
            >
              {allSelected ? "Deselect All" : `Select All (${applications.length})`}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="default"
              disabled={isBulkProcessing}
              onClick={handleBulkScreen}
              className="h-7 text-xs gap-1.5"
            >
              {isBulkProcessing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Bulk AI Screen ({selectedAppIds.length})
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={isBulkProcessing}
              onClick={() => handleBulkStatus("SHORTLISTED")}
              className="h-7 text-xs gap-1 text-violet-600 hover:text-violet-700 dark:text-violet-400"
            >
              <Star className="h-3.5 w-3.5" />
              Shortlist
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={isBulkProcessing}
              onClick={() => handleBulkStatus("INTERVIEW")}
              className="h-7 text-xs gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <Users className="h-3.5 w-3.5" />
              Interview
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={isBulkProcessing}
              onClick={() => handleBulkStatus("HIRED")}
              className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Hire
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={isBulkProcessing}
              onClick={() => handleBulkStatus("REJECTED")}
              className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedAppIds([])}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Applications List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 mx-4 my-3 rounded-lg bg-muted/40 animate-pulse"
              />
            ))}
          </CardContent>
        </Card>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="py-20 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {search
                ? "No applications found"
                : selectedJobId !== "ALL"
                  ? `No applications for "${selectedJob?.title || 'this job'}"`
                  : "No applications yet"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {search
                ? `No applications match "${search}".`
                : selectedJobId !== "ALL"
                  ? "Candidates have not yet applied to this position, or no applications match the selected status filter."
                  : "Applications will appear here once candidates apply for active job postings."}
            </p>
            {selectedJobId !== "ALL" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleJobChange("ALL")}
                className="mt-4 text-xs gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Clear Job Filter
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[auto_3fr_2fr_2fr_auto] items-center gap-3 px-4 py-2.5 border-b border-border/60 bg-muted/20">
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                aria-label="Select all applications"
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = selectedAppIds.length > 0 && !allSelected;
                  }
                }}
                onChange={handleToggleSelectAll}
                className="h-3.5 w-3.5 rounded-sm border-input text-primary focus:ring-ring cursor-pointer align-middle"
              />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Candidate
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Status
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              AI Score
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Actions
            </span>
          </div>
          <CardContent className="p-0">
            {applications.map((app) => (
              <ApplicationRow
                key={app.id}
                app={app}
                isSelected={selectedAppIds.includes(app.id)}
                onToggleSelect={toggleSelectApp}
                onScreen={(id) => {
                  if (!screenMutation.isPending) {
                    screenMutation.mutate(id);
                  }
                }}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}

// ── Main Page (Role Router with Suspense boundary) ────────────────────────────

export default function ApplicationsPage() {
  return (
    <React.Suspense
      fallback={
        <PageContainer
          title="Applications"
          subtitle="Track candidate submissions, run AI screenings, and manage the hiring pipeline."
        >
          <div className="space-y-4">
            <div className="h-16 rounded-xl bg-muted/40 animate-pulse" />
            <div className="h-64 rounded-xl bg-muted/40 animate-pulse" />
          </div>
        </PageContainer>
      }
    >
      <ApplicationsContent />
    </React.Suspense>
  );
}

function ApplicationsContent() {
  const { user } = useAuth();

  // Route to the correct view based on role.
  // Each sub-component has its own hooks — no hooks are called before this check.
  if (user?.role === "APPLICANT") {
    return <ApplicantApplicationsView />;
  }

  return <RecruiterApplicationsView />;
}
