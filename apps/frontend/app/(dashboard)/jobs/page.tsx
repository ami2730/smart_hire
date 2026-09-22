"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  MapPin,
  Users,
  Sparkles,
  ChevronDown,
  ArrowRight,
  MoreHorizontal,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Archive,
  TrendingUp,
  Building2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { jobsApi, type Job, type JobStatus } from "@/lib/api/jobs.api";
import { useAuth } from "@/lib/auth/auth-context";

// ── Status Configuration ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; icon: React.ElementType; className: string; dot: string }
> = {
  ACTIVE: {
    label: "Active",
    icon: CheckCircle2,
    className: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900",
    dot: "bg-emerald-500",
  },
  DRAFT: {
    label: "Draft",
    icon: Clock,
    className: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-900",
    dot: "bg-amber-500",
  },
  CLOSED: {
    label: "Closed",
    icon: XCircle,
    className: "text-slate-500 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/40 dark:border-slate-700",
    dot: "bg-slate-400",
  },
  ARCHIVED: {
    label: "Archived",
    icon: Archive,
    className: "text-slate-400 bg-slate-50 border-slate-200 dark:text-slate-500 dark:bg-slate-900/20 dark:border-slate-800",
    dot: "bg-slate-300",
  },
};

// ── Score Badge ─────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score?: number }) {
  if (score === undefined || score === null) return null;
  const color =
    score >= 85
      ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30"
      : score >= 70
        ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30"
        : score >= 55
          ? "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30"
          : "text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
        color
      )}
    >
      <TrendingUp className="h-3 w-3" />
      {score}%
    </span>
  );
}

// ── Job Card ────────────────────────────────────────────────────────────────

function JobCard({ job, onPublish, onClose }: {
  job: Job;
  onPublish?: (id: string) => void;
  onClose?: (id: string) => void;
}) {
  const status = STATUS_CONFIG[job.status];
  const StatusIcon = status.icon;

  return (
    <div
      className={cn(
        "group relative flex flex-col bg-card border border-border/60 rounded-xl p-5 hover:border-border hover:shadow-sm transition-all duration-150",
        job.status === "DRAFT" && "border-dashed"
      )}
    >
      {/* Top row: status + actions */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold",
            status.className
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Job actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link href={`/jobs/${job.id}`} className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/applications?jobId=${job.id}`} className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                View Applications
              </Link>
            </DropdownMenuItem>
            {job.status === "DRAFT" && onPublish && (
              <DropdownMenuItem
                onClick={() => onPublish(job.id)}
                className="text-emerald-600 dark:text-emerald-400"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Publish Job
              </DropdownMenuItem>
            )}
            {job.status === "ACTIVE" && onClose && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onClose(job.id)}
                  className="text-destructive"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Close Job
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Job title */}
      <Link href={`/jobs/${job.id}`}>
        <h3 className="text-sm font-semibold text-foreground leading-snug mb-1 group-hover:text-primary transition-colors hover:underline">
          {job.title}
        </h3>
      </Link>

      {/* Meta: department + location */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
        {job.department && (
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3 shrink-0" />
            {job.department}
          </span>
        )}
        {job.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {job.location}
          </span>
        )}
      </div>

      {/* Required skills (top 4) */}
      {job.requiredSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {job.requiredSkills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-foreground/70"
            >
              {skill}
            </span>
          ))}
          {job.requiredSkills.length > 4 && (
            <span className="inline-flex items-center rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              +{job.requiredSkills.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Bottom stats */}
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/40">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Link
            href={`/applications?jobId=${job.id}`}
            className="flex items-center gap-1 hover:text-primary transition-colors"
            title="View applications for this job"
          >
            <Users className="h-3.5 w-3.5" />
            <strong className="text-foreground font-semibold">
              {job.applicationCount ?? 0}
            </strong>{" "}
            applicants
          </Link>
          {job.screeningCount !== undefined && job.screeningCount > 0 && (
            <Link
              href={`/jobs/${job.id}/screening`}
              className="flex items-center gap-1 hover:text-primary transition-colors"
              title="View screening leaderboard"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <strong className="text-foreground font-semibold">
                {job.screeningCount}
              </strong>{" "}
              screened
            </Link>
          )}
        </div>
        <ScoreBadge score={job.topMatchScore} />
      </div>
    </div>
  );
}

// ── Filter Tabs ─────────────────────────────────────────────────────────────

const FILTER_TABS: { label: string; value: JobStatus | "ALL" }[] = [
  { label: "All Jobs", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Draft", value: "DRAFT" },
  { label: "Closed", value: "CLOSED" },
];

// ── Main Page ────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const isApplicant = user?.role === "APPLICANT";
  const isRecruiter = user?.role === "RECRUITER";

  const initialStatus = (searchParams.get("status") || "ALL").toUpperCase();
  const [statusFilter, setStatusFilter] = React.useState<JobStatus | "ALL">(
    ["ACTIVE", "DRAFT", "CLOSED", "ARCHIVED"].includes(initialStatus)
      ? (initialStatus as JobStatus)
      : "ALL"
  );
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  React.useEffect(() => {
    const fromUrl = searchParams.get("status");
    if (fromUrl) {
      const up = fromUrl.toUpperCase();
      if (["ACTIVE", "DRAFT", "CLOSED", "ARCHIVED"].includes(up)) {
        setStatusFilter(up as JobStatus);
      } else if (up === "ALL") {
        setStatusFilter("ALL");
      }
    }
  }, [searchParams]);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleFilterClick = (val: JobStatus | "ALL") => {
    setStatusFilter(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val === "ALL") {
      params.delete("status");
    } else {
      params.set("status", val.toLowerCase());
    }
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  // Always fetch jobs for the current user/recruiter
  // client-side filtering keeps accurate tab counts for Draft / Active / Closed.
  const { data, isLoading } = useQuery({
    queryKey: ["jobs", isRecruiter ? `recruiter-${user?.id}` : "all", debouncedSearch],
    queryFn: () =>
      jobsApi.list({
        search: debouncedSearch || undefined,
        limit: 100,
        recruiterId: isRecruiter ? user?.id : undefined,
      }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => jobsApi.publish(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => jobsApi.close(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const allJobs = data?.jobs ?? [];

  // For applicants, filter out draft or closed jobs so they only see published active jobs
  const visibleAllJobs = React.useMemo(() => {
    if (isApplicant) {
      return allJobs.filter((j) => j.status === "ACTIVE");
    }
    return allJobs;
  }, [allJobs, isApplicant]);

  // Client-side filter by selected status tab
  const jobs = React.useMemo(() => {
    if (isApplicant) return visibleAllJobs;
    if (statusFilter === "ALL") return visibleAllJobs;
    return visibleAllJobs.filter((j) => j.status === statusFilter);
  }, [visibleAllJobs, statusFilter, isApplicant]);

  const total = data?.pagination?.total ?? visibleAllJobs.length;

  // Compute counts per status for tab badges (always based on full unfiltered list)
  const statusCounts = React.useMemo(() => ({
    ALL: visibleAllJobs.length,
    ACTIVE: visibleAllJobs.filter((j) => j.status === "ACTIVE").length,
    DRAFT: visibleAllJobs.filter((j) => j.status === "DRAFT").length,
    CLOSED: visibleAllJobs.filter((j) => j.status === "CLOSED").length,
  }), [visibleAllJobs]);

  return (
    <PageContainer
      title={
        isApplicant
          ? "Browse Job Openings"
          : isRecruiter
            ? "My Job Postings"
            : "Job Postings"
      }
      subtitle={
        isApplicant
          ? "Explore available positions and apply to roles that match your skills."
          : isRecruiter
            ? "Manage your open positions, configure skill requirements, and track your candidate pipelines."
            : "Manage open positions, configure skill requirements, and track candidate pipelines."
      }
      actions={
        !isApplicant ? (
          <Link href="/jobs/new">
            <Button size="sm" className="gap-1.5 font-medium shadow-xs">
              <Plus className="h-4 w-4" />
              <span>Post Job</span>
            </Button>
          </Link>
        ) : undefined
      }
    >
      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Status Filter Tabs - Only shown for recruiters/admins since applicants only see active jobs */}
        {!isApplicant ? (
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50 text-xs">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleFilterClick(tab.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer",
                  statusFilter === tab.value
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {statusCounts[tab.value as keyof typeof statusCounts] > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full px-1 text-[10px] font-bold",
                      statusFilter === tab.value
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {statusCounts[tab.value as keyof typeof statusCounts]}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-primary" />
            <span>Open Positions</span>
          </div>
        )}

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Jobs Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-52 rounded-xl bg-muted/40 animate-pulse border border-border/40"
            />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-20 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Briefcase className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {search
                ? "No matching jobs found"
                : statusFilter !== "ALL"
                ? `No ${statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()} jobs`
                : "No jobs yet"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {search
                ? `No jobs match "${search}". Try a different search term.`
                : statusFilter !== "ALL"
                ? `You have no ${statusFilter.toLowerCase()} job postings at the moment.`
                : "Create your first job posting to start attracting candidates."}
            </p>
            {!search && statusFilter === "ALL" && !isApplicant && (
              <Link href="/jobs/new" className="mt-4">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Post Your First Job
                </Button>
              </Link>
            )}
            {statusFilter !== "ALL" && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => handleFilterClick("ALL")}
              >
                Clear Status Filter
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="text-xs text-muted-foreground -mt-1">
            Showing <strong className="text-foreground">{jobs.length}</strong>{" "}
            {statusFilter !== "ALL" && (
              <>
                <span className="text-muted-foreground">{statusFilter.toLowerCase()}</span>{" "}
              </>
            )}
            of <strong className="text-foreground">{allJobs.length}</strong> jobs
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onPublish={!isApplicant ? (id) => publishMutation.mutate(id) : undefined}
                onClose={!isApplicant ? (id) => closeMutation.mutate(id) : undefined}
              />
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}
