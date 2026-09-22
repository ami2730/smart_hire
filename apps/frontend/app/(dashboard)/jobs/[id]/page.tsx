"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Building2,
  Users,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Edit2,
  Zap,
  BarChart3,
  Award,
  ChevronDown,
  GraduationCap,
  Star,
  Loader2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { jobsApi, type Job, type JobStatus } from "@/lib/api/jobs.api";
import { applicationsApi, type Application } from "@/lib/api/applications.api";
import { applicantApi } from "@/lib/api/applicant.api";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/components/ui/toast";

// ── Status Configuration ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<JobStatus, { label: string; className: string; dot: string }> = {
  ACTIVE: {
    label: "Active",
    className: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900",
    dot: "bg-emerald-500",
  },
  DRAFT: {
    label: "Draft",
    className: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-900",
    dot: "bg-amber-500",
  },
  CLOSED: {
    label: "Closed",
    className: "text-slate-500 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/40 dark:border-slate-700",
    dot: "bg-slate-400",
  },
  ARCHIVED: {
    label: "Archived",
    className: "text-slate-400 bg-slate-50 border-slate-200 dark:text-slate-500",
    dot: "bg-slate-300",
  },
};

const REC_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  STRONG_MATCH: { label: "Strong Match", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500" },
  GOOD_MATCH: { label: "Good Match", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500" },
  MODERATE_MATCH: { label: "Moderate", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500" },
  LOW_MATCH: { label: "Low Match", color: "text-slate-500", bg: "bg-slate-400" },
};

// ── Score Bar ───────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 85 ? "bg-emerald-500" : score >= 70 ? "bg-blue-500" : score >= 55 ? "bg-amber-500" : "bg-slate-400";
  const textColor = score >= 85 ? "text-emerald-600 dark:text-emerald-400" : score >= 70 ? "text-blue-600 dark:text-blue-400" : score >= 55 ? "text-amber-600 dark:text-amber-400" : "text-slate-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn("text-xs font-bold tabular-nums w-8 text-right shrink-0", textColor)}>{score}%</span>
    </div>
  );
}

// ── Ranked Candidate Row ─────────────────────────────────────────────────────

function RankedCandidateRow({ app, rank }: { app: Application; rank: number }) {
  const rec = app.recommendation ? REC_CONFIG[app.recommendation] : null;
  const medalClass = rank === 1 ? "text-amber-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-amber-700" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
      {/* Rank */}
      <div className={cn("w-6 text-center text-sm font-bold shrink-0", medalClass)}>
        {rank <= 3 ? <Star className="h-4 w-4 inline fill-current" /> : <span className="text-xs text-muted-foreground">{rank}</span>}
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
          {app.candidateName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{app.candidateName}</p>
          <p className="text-xs text-muted-foreground truncate">{app.candidateEmail}</p>
        </div>
      </div>

      {/* Score bar */}
      <div className="w-32 shrink-0">
        {app.matchScore !== null && app.matchScore !== undefined ? (
          <ScoreBar score={app.matchScore} />
        ) : (
          <span className="text-xs text-muted-foreground">Not screened</span>
        )}
      </div>

      {/* Recommendation badge */}
      <div className="shrink-0 hidden sm:block">
        {rec ? (
          <span className={cn("text-[10px] font-semibold", rec.color)}>
            {rec.label}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
      </div>

      {/* Status */}
      <div className="shrink-0 hidden md:block">
        <span className="text-[10px] font-medium text-muted-foreground capitalize">
          {app.status.toLowerCase().replace("_", " ")}
        </span>
      </div>
    </div>
  );
}

// ── Stats Grid ───────────────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  label,
  value,
  color = "text-primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-4 rounded-xl border border-border/60 bg-card">
      <Icon className={cn("h-4 w-4 mb-1.5", color)} />
      <span className="text-xl font-bold text-foreground tabular-nums">{value}</span>
      <span className="text-[10px] text-muted-foreground font-medium mt-0.5">{label}</span>
    </div>
  );
}

// ── Edit Job Dialog ─────────────────────────────────────────────────────────

function EditJobDialog({
  open,
  onOpenChange,
  job,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
}) {
  const { toast } = useToast();
  const [editTitle, setEditTitle] = React.useState(job.title);
  const [editDept, setEditDept] = React.useState(job.department || "");
  const [editLocation, setEditLocation] = React.useState(job.location || "");

  React.useEffect(() => {
    if (open) {
      setEditTitle(job.title);
      setEditDept(job.department || "");
      setEditLocation(job.location || "");
    }
  }, [open, job]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    job.title = editTitle;
    job.department = editDept;
    job.location = editLocation;
    onOpenChange(false);
    toast({
      title: "Job updated",
      description: "Job posting details updated successfully.",
      variant: "success",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Edit2 className="h-4 w-4 text-primary" /> Edit Job Vacancy
          </DialogTitle>
          <DialogDescription className="text-xs">
            Update posting details for {job.title}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSaveEdit} className="space-y-4 pt-2 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-foreground">Job Title</label>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
              className="text-xs h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-foreground">Department</label>
            <Input
              value={editDept}
              onChange={(e) => setEditDept(e.target.value)}
              className="text-xs h-9"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-foreground">Location</label>
            <Input
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              className="text-xs h-9"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="text-xs h-8">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const jobId = params?.id as string;

  const isApplicant = user?.role === "APPLICANT";
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => jobsApi.getById(jobId),
    enabled: !!jobId,
  });

  // Only recruiters fetch full applications list for the job
  const { data: applicationsData, isLoading: appsLoading } = useQuery({
    queryKey: ["applications", "job", jobId],
    queryFn: () => applicationsApi.list({ jobId, limit: 50 }),
    enabled: !!jobId && !isApplicant,
  });

  // For applicant: check existing applications & resumes
  const { data: myApplications = [] } = useQuery({
    queryKey: ["applicant", user?.id, "my-apps"],
    queryFn: () => applicantApi.getApplications(),
    enabled: isApplicant,
  });

  const { data: myResumes = [] } = useQuery({
    queryKey: ["applicant", user?.id, "resumes"],
    queryFn: () => applicantApi.getResumes(),
    enabled: isApplicant,
  });

  const existingApp = myApplications.find((a) => a.jobId === jobId);

  // Apply dialog state
  const [isApplyOpen, setIsApplyOpen] = React.useState(false);
  const [selectedResumeId, setSelectedResumeId] = React.useState<string>("");
  const [coverLetter, setCoverLetter] = React.useState("");
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    if (myResumes.length > 0) {
      const exists = myResumes.some((r) => r.id === selectedResumeId);
      if (!exists) {
        const def = myResumes.find((r) => r.isDefault) || myResumes[0];
        setSelectedResumeId(def.id);
      }
    } else {
      setSelectedResumeId("");
    }
  }, [myResumes, selectedResumeId]);

  const applyMutation = useMutation({
    mutationFn: async () => {
      let resumeId: string | undefined = undefined;
      if (uploadFile) {
        const uploaded = await applicantApi.uploadResume(uploadFile, true);
        resumeId = uploaded.id;
        queryClient.invalidateQueries({ queryKey: ["applicant"] });
        queryClient.invalidateQueries({ queryKey: ["applicant-resumes"] });
      } else if (selectedResumeId) {
        const matched = myResumes.find((r) => r.id === selectedResumeId);
        resumeId = matched ? matched.id : (myResumes[0]?.id || undefined);
      } else if (myResumes.length > 0) {
        const def = myResumes.find((r) => r.isDefault) || myResumes[0];
        resumeId = def?.id;
      }

      if (!resumeId && !uploadFile && myResumes.length === 0) {
        throw new Error("Please upload a resume before submitting your application.");
      }

      return applicantApi.applyForJob({
        jobId,
        resumeId,
        coverLetter: coverLetter.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicant"] });
      queryClient.invalidateQueries({ queryKey: ["applicant-resumes"] });
      queryClient.invalidateQueries({ queryKey: ["applications", "job", jobId] });
      setIsApplyOpen(false);
      setCoverLetter("");
      setUploadFile(null);
      toast({
        title: "Application Submitted!",
        description: "Your application has been received and is now in review.",
        variant: "success",
      });
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to submit application. Please try again.";
      toast({ title: "Application Failed", description: msg, variant: "error" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => jobsApi.publish(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "Job published", description: "This job is now accepting applications.", variant: "success" });
    },
    onError: () => toast({ title: "Failed to publish", variant: "error" }),
  });

  const closeMutation = useMutation({
    mutationFn: () => jobsApi.close(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "Job closed", description: "This job is no longer accepting applications.", variant: "info" });
    },
    onError: () => toast({ title: "Failed to close job", variant: "error" }),
  });

  if (jobLoading) {
    return (
      <PageContainer title="Job Details">
        <div className="space-y-4">
          <div className="h-32 rounded-xl bg-muted/40 animate-pulse" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!job) {
    return (
      <PageContainer title="Job Not Found">
        <Card>
          <CardContent className="py-20 text-center">
            <p className="text-muted-foreground text-sm">This job posting could not be found.</p>
            <Link href="/jobs" className="mt-4 inline-block">
              <Button variant="outline" size="sm">← Back to Jobs</Button>
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const statusCfg = STATUS_CONFIG[job.status];
  const applications = applicationsData?.applications ?? [];
  const screened = applications.filter((a) => a.isScreened);
  const ranked = [...screened].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  const unscreened = applications.filter((a) => !a.isScreened);
  const avgScore = screened.length > 0
    ? Math.round(screened.reduce((s, a) => s + (a.matchScore ?? 0), 0) / screened.length)
    : 0;



  return (
    <PageContainer
      title={job.title}
      subtitle={[job.department, job.location].filter(Boolean).join(" · ")}
      actions={
        <div className="flex items-center gap-2">
          {isApplicant ? (
            <>
              {existingApp ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Applied · {existingApp.status}</span>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="gap-1.5 font-semibold text-xs"
                  onClick={() => setIsApplyOpen(true)}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Apply for Position
                </Button>
              )}
            </>
          ) : (
            <>
              <Link href={`/applications?jobId=${job.id}`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs font-medium">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  Applications ({job.applicationCount ?? applications.length})
                </Button>
              </Link>
              <Link href={`/jobs/${job.id}/screening`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Screening Leaderboard
                </Button>
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditOpen(true)}
                className="gap-1.5 text-xs font-medium"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit
              </Button>
              {job.status === "DRAFT" && (
                <Button
                  size="sm"
                  className="gap-1.5 font-medium text-xs"
                  disabled={publishMutation.isPending}
                  onClick={() => publishMutation.mutate()}
                >
                  {publishMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Publish Job
                </Button>
              )}
              {job.status === "ACTIVE" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                  disabled={closeMutation.isPending}
                  onClick={() => closeMutation.mutate()}
                >
                  {closeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  Close Job
                </Button>
              )}
            </>
          )}
          <Link href="/jobs">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          </Link>
        </div>
      }
    >
      {/* Apply Dialog for Applicant */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Apply for {job.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Submit your CV and cover letter for this position.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-xs">
            {/* Resume Selection / Upload */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Select Resume / CV</label>
              {myResumes.length > 0 && !uploadFile && (
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  {myResumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.originalFileName} {r.isDefault ? "(Default)" : ""}
                    </option>
                  ))}
                </select>
              )}

              <div className="pt-1">
                <label className="text-[11px] text-muted-foreground block mb-1">
                  Or upload a new CV (PDF / DOCX):
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setUploadFile(f);
                  }}
                  className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
            </div>

            {/* Cover Letter */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Cover Letter (Optional)</label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Introduce yourself and explain why you're a great fit for this role..."
                rows={4}
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsApplyOpen(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-xs h-8 gap-1.5"
                disabled={applyMutation.isPending}
                onClick={() => applyMutation.mutate()}
              >
                {applyMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Submit Application</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Job Dialog (Phase 4) */}
      <EditJobDialog open={isEditOpen} onOpenChange={setIsEditOpen} job={job} />
      {/* Header card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold", statusCfg.className)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)} />
                    {statusCfg.label}
                  </span>
                  {job.minimumExperienceYears && (
                    <span className="text-xs text-muted-foreground border border-border/60 rounded-md px-2 py-0.5">
                      {job.minimumExperienceYears}+ years exp.
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {job.department && (
                    <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{job.department}</span>
                  )}
                  {job.location && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Posted {new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recruiter Stats (Recruiter/Admin Only) */}
      {!isApplicant && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill icon={Users} label="Total Applicants" value={applications.length} />
          <StatPill icon={Sparkles} label="Screened" value={screened.length} color="text-blue-500" />
          <StatPill icon={TrendingUp} label="Avg Score" value={avgScore > 0 ? `${avgScore}%` : "—"} color="text-emerald-500" />
          <StatPill icon={BarChart3} label="Top Score" value={ranked[0]?.matchScore ? `${ranked[0].matchScore}%` : "—"} color="text-violet-500" />
        </div>
      )}

      {/* Two-column layout */}
      <div className={cn("grid gap-6", isApplicant ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1 lg:grid-cols-3")}>
        {/* Left: Description + Skills + Responsibilities */}
        <div className={cn("space-y-5", isApplicant ? "lg:col-span-2" : "lg:col-span-1")}>
          {/* Description */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-semibold">About This Role</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {job.description}
              </p>
            </CardContent>
          </Card>

          {/* Required Skills */}
          {job.requiredSkills.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  Required Technical Competencies
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-1.5">
                  {job.requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Education & Experience */}
          {job.educationRequirements.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  Qualifications & Education
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-1.5">
                  {job.educationRequirements.map((req) => (
                    <li key={req} className="flex items-start gap-2 text-sm text-foreground/80">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      {req}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Applicant Call-to-Action OR Recruiter Candidate Rankings */}
        {isApplicant ? (
          <div className="space-y-5">
            <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-semibold">Application Status</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {existingApp ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg border border-primary/20 bg-primary/10 text-xs">
                      <p className="font-semibold text-primary">Application Submitted</p>
                      <p className="text-muted-foreground mt-0.5">
                        Status: <strong className="text-foreground capitalize">{existingApp.status.toLowerCase().replace("_", " ")}</strong>
                      </p>
                      <p className="text-muted-foreground text-[11px] mt-1">
                        Applied on {new Date(existingApp.appliedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Link href="/applications" className="block">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        View in My Applications
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Ready to join? Submit your CV and cover letter to be evaluated by our recruitment team.
                    </p>
                    <Button
                      size="sm"
                      className="w-full text-xs font-semibold gap-1.5"
                      onClick={() => {
                        setUploadFile(null);
                        const def = myResumes.find((r) => r.isDefault) || myResumes[0];
                        if (def) setSelectedResumeId(def.id);
                        setIsApplyOpen(true);
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Apply for This Position
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-semibold">Role Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Location</span>
                  <span className="font-semibold text-foreground">{job.location || "Remote"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Employment Type</span>
                  <span className="font-semibold text-foreground">{job.employmentType || "Full-time"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Minimum Experience</span>
                  <span className="font-semibold text-foreground">
                    {job.minimumExperienceYears ? `${job.minimumExperienceYears}+ years` : "Entry-level"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="lg:col-span-2 space-y-5">
            {/* Ranked leaderboard for Recruiter */}
            <Card>
              <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    Candidate Rankings
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Sorted by AI match score — highest first
                  </CardDescription>
                </div>
                {applications.length > 0 && (
                  <Link href={`/applications?jobId=${job.id}`}>
                    <Button variant="outline" size="sm" className="text-xs gap-1">
                      All Applications
                    </Button>
                  </Link>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {appsLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : ranked.length === 0 ? (
                  <div className="py-16 flex flex-col items-center text-center px-6">
                    <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                      <Sparkles className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No screened candidates yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      {applications.length > 0
                        ? `${unscreened.length} application${unscreened.length !== 1 ? "s" : ""} pending AI screening.`
                        : "No applications submitted for this job yet."}
                    </p>
                    {applications.length > 0 && (
                      <Link href="/screening" className="mt-3">
                        <Button size="sm" className="gap-1.5 text-xs">
                          <Sparkles className="h-3.5 w-3.5" />
                          Go to Screening
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="hidden sm:grid grid-cols-[2rem_1fr_8rem_6rem_6rem] gap-2 px-4 py-2 border-b border-border/40 bg-muted/20">
                      {["#", "Candidate", "Score", "Match", "Status"].map((h) => (
                        <span key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {h}
                        </span>
                      ))}
                    </div>
                    {ranked.map((app, idx) => (
                      <RankedCandidateRow key={app.id} app={app} rank={idx + 1} />
                    ))}
                    {unscreened.length > 0 && (
                      <div className="px-4 py-3 bg-muted/10 border-t border-border/40 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          <strong className="text-foreground">{unscreened.length}</strong> candidate{unscreened.length !== 1 ? "s" : ""} pending screening
                        </span>
                        <Link href="/screening">
                          <Button size="sm" variant="outline" className="text-xs gap-1 h-7">
                            <Sparkles className="h-3 w-3" />
                            Screen Now
                          </Button>
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
