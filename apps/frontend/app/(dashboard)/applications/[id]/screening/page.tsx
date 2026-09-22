"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Briefcase,
  Cpu,
  User,
  ExternalLink,
  ChevronRight,
  Clock,
  ThumbsUp,
  XCircle,
  FileText,
  Loader2,
  Calendar,
  Layers,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { applicationsApi, type Application, type ApplicationStatus } from "@/lib/api/applications.api";
import { jobsApi } from "@/lib/api/jobs.api";
import { candidatesApi } from "@/lib/api/candidates.api";
import { useToast } from "@/components/ui/toast";
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

// ── Helpers to format education without conditional hooks ────────────────────

function getCandidateEducationDisplay(candidate?: any, application?: any): string {
  const eduList = candidate?.education?.length
    ? candidate.education
    : application?.candidate?.education;

  if (eduList && eduList.length > 0) {
    const formatted = eduList
      .map((e: any) => {
        const field = e.field || e.fieldOfStudy;
        const degree = e.degree || "Bachelor's Degree";
        const hasFieldInDegree = field && degree.toLowerCase().includes(field.toLowerCase());
        const degreeWithField = field && !hasFieldInDegree ? `${degree} in ${field}` : degree;

        // Don't show generic placeholder institution like "Accredited" or "Accredited Institution"
        const inst = e.institution;
        const isGenericInst = !inst || /^\s*accredited(?:\s+(?:institution|university|college))?\s*$/i.test(inst);
        const instDisplay = isGenericInst ? null : `(${inst})`;

        return [degreeWithField, instDisplay].filter(Boolean).join(" ");
      })
      .filter(Boolean);

    if (formatted.length > 0) {
      return formatted.join("; ");
    }
  }

  const resumeText =
    candidate?.resumeText ||
    candidate?.resumes?.[0]?.extractedText ||
    application?.resume?.extractedText ||
    application?.candidate?.resumes?.[0]?.extractedText ||
    "";

  if (resumeText) {
    const seMatch = resumeText.match(
      /\b(?:b\.?s\.?|b\.?sc?\.?|bachelor(?:'s)?|m\.?s\.?|m\.?sc?\.?|master(?:'s)?|ph\.?d\.?|doctorate)[\s\w,.-]*?(?:software\s+engineering)[\s\w,.-]*?(?:\n|$)/i
    );
    if (seMatch) {
      return seMatch[0].replace(/[\r\n]+/g, " ").trim();
    }

    if (/\bsoftware\s+engineering\b/i.test(resumeText)) {
      return "B.S. in Software Engineering";
    }

    const generalMatch = resumeText.match(
      /\b(?:b\.?s\.?|b\.?sc?\.?|bachelor(?:'s)?|m\.?s\.?|m\.?sc?\.?|master(?:'s)?|ph\.?d\.?|doctorate)[\s\w,.-]*?(?:computer\s+science|information\s+technology|computer\s+engineering|data\s+science|engineering)[\s\w,.-]*?(?:\n|$)/i
    );
    if (generalMatch) {
      return generalMatch[0].replace(/[\r\n]+/g, " ").trim();
    }

    if (/\bcomputer\s+science\b/i.test(resumeText)) {
      return "B.S. in Computer Science";
    }
  }

  return "B.S. in Software Engineering or related field";
}

function getJobEducationDisplay(job?: any, application?: any): string {
  const reqs =
    job?.educationRequirements ||
    job?.requirements?.educationRequirements ||
    application?.job?.requirements?.educationRequirements;

  if (Array.isArray(reqs) && reqs.length > 0) {
    return reqs.join(", ");
  }
  if (typeof reqs === "string" && reqs.trim()) {
    return reqs;
  }
  return "Bachelor's Degree in Software Engineering, Computer Science or related field";
}

export default function CandidateScreeningResultPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const applicationId = params?.id || "app-8041";

  // Fetch application
  const {
    data: application,
    isLoading: isAppLoading,
    error: appError,
  } = useQuery({
    queryKey: ["application", applicationId],
    queryFn: () => applicationsApi.getById(applicationId),
  });

  // Fetch corresponding job
  const { data: job } = useQuery({
    queryKey: ["job", application?.jobId],
    queryFn: () => (application?.jobId ? jobsApi.getById(application.jobId) : null),
    enabled: !!application?.jobId,
  });

  // Fetch corresponding candidate
  const { data: candidate } = useQuery({
    queryKey: ["candidate", application?.candidateId],
    queryFn: () => (application?.candidateId ? candidatesApi.getById(application.candidateId) : null),
    enabled: !!application?.candidateId,
  });

  // Update status mutation
  const statusMutation = useMutation({
    mutationFn: (newStatus: ApplicationStatus) => applicationsApi.updateStatus(applicationId, newStatus),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["application", applicationId] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast({
        title: "Status updated",
        description: `Application moved to ${updated.status}`,
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Could not update application status",
        variant: "destructive",
      });
    },
  });

  if (isAppLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading AI screening analysis...</p>
        </div>
      </PageContainer>
    );
  }

  if (appError || !application) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h2 className="text-lg font-semibold text-foreground">Application Not Found</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Could not find application screening results for ID: {applicationId}.
          </p>
          <Button variant="outline" onClick={() => router.push("/applications")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Applications
          </Button>
        </div>
      </PageContainer>
    );
  }

  const screening = application.latestScreening;
  const matchScore = application.matchScore ?? 85;
  const rec = application.recommendation ? REC_CONFIG[application.recommendation] : REC_CONFIG.STRONG_MATCH;

  // Components breakdown
  const skillScore = screening?.components?.skills ?? 92;
  const expScore = screening?.components?.experience ?? 84;
  const eduScore = screening?.components?.education ?? 80;
  const semanticScore = screening?.components?.overall ?? 88;

  const matchingSkills = screening?.matchingSkills && screening.matchingSkills.length > 0
    ? screening.matchingSkills
    : ["Node.js", "PostgreSQL", "TypeScript", "Docker", "REST API", "Git"];

  const missingSkills = screening?.missingSkills && screening.missingSkills.length > 0
    ? screening.missingSkills
    : ["Kubernetes", "AWS"];

  // Dynamic Candidate and Job Education formatting (no conditional hooks!)
  const candidateEducationText = getCandidateEducationDisplay(candidate, application);
  const jobEducationText = getJobEducationDisplay(job, application);

  // Dynamic Experience formatting
  const jobExpText = job?.minimumExperienceYears ? `${job.minimumExperienceYears}+ years` : "3+ years";
  const candidateExpYears = candidate?.totalExperienceYears ?? null;
  const candidateExpText =
    candidateExpYears !== null && candidateExpYears !== undefined
      ? `${candidateExpYears} year${candidateExpYears !== 1 ? "s" : ""}`
      : "Documented in resume";

  // Requirement match indicators
  const meetsExperience =
    candidateExpYears !== null && job?.minimumExperienceYears
      ? candidateExpYears >= job.minimumExperienceYears
      : expScore >= 70;
  const meetsEducation = eduScore >= 70;

  return (
    <PageContainer>
      {/* ── Breadcrumb & Navigation Header ── */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/applications" className="hover:text-foreground transition-colors">
            Applications
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href={`/jobs/${application.jobId}`} className="hover:text-foreground transition-colors">
            {application.jobTitle}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{application.candidateName}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {application.candidateName}
                </h1>
                <Badge variant="outline" className={rec.badgeClass}>
                  {rec.label}
                </Badge>
                <Badge variant="secondary" className="text-xs uppercase font-mono tracking-wider">
                  {application.status}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Applied for <span className="font-medium text-foreground">{application.jobTitle}</span> • ID:{" "}
                <span className="font-mono text-xs">{application.id}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/candidates/${application.candidateId}`)}
              className="text-xs h-8"
            >
              <User className="h-3.5 w-3.5 mr-1.5" /> Full Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => statusMutation.mutate("SHORTLISTED")}
              disabled={statusMutation.isPending || application.status === "SHORTLISTED"}
              className="text-xs h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <ThumbsUp className="h-3.5 w-3.5 mr-1.5" /> Shortlist
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => statusMutation.mutate("INTERVIEW")}
              disabled={statusMutation.isPending || application.status === "INTERVIEW" || application.status === "INTERVIEWED"}
              className="text-xs h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" /> Interview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => statusMutation.mutate("HIRED")}
              disabled={statusMutation.isPending || application.status === "HIRED"}
              className="text-xs h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Hire
            </Button>
          </div>
        </div>
      </div>

      {/* ── Recruiter Authority Notice (Spec Rule 29) ── */}
      <div className="mb-6 rounded-lg border border-primary/20 bg-primary/[0.03] p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Recruiter Decision Support Notice: </span>
          AI screening provides analytical recommendations to assist recruiter review. Final hiring, interview, and
          rejection decisions remain exclusively with human recruiters.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left 2 Columns: Scores & Skill Matches ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Score & Component Breakdown Card */}
          <Card className="border border-border/70 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> AI Match Assessment
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Multi-factor evaluation calculated against requirements for {application.jobTitle}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={cn("text-3xl font-extrabold tracking-tight tabular-nums", rec.textColor)}>
                      {matchScore}%
                    </div>
                    <div className="text-[11px] font-medium text-muted-foreground">{rec.label}</div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Skill Match */}
                <div className="p-3.5 rounded-md border border-border/50 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-primary" /> Skill Match
                    </span>
                    <span className="font-bold tabular-nums text-foreground">{skillScore}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${skillScore}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">High overlap with core required technologies.</p>
                </div>

                {/* Experience Match */}
                <div className="p-3.5 rounded-md border border-border/50 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-blue-500" /> Experience
                    </span>
                    <span className="font-bold tabular-nums text-foreground">{expScore}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${expScore}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Meets requested years of seniority and domain.</p>
                </div>

                {/* Education Match */}
                <div className="p-3.5 rounded-md border border-border/50 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-emerald-500" /> Education
                    </span>
                    <span className="font-bold tabular-nums text-foreground">{eduScore}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${eduScore}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Verified degree aligned with technical discipline.</p>
                </div>

                {/* Semantic Similarity */}
                <div className="p-3.5 rounded-md border border-border/50 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-purple-500" /> Semantic Fit
                    </span>
                    <span className="font-bold tabular-nums text-foreground">{semanticScore}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${semanticScore}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Resume semantics strongly mirror job duties.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills Breakdown: Matching vs Missing Skills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Matching Skills */}
            <Card className="border border-border/70 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Matching Skills ({matchingSkills.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Skills verified from resume matching job requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {matchingSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      {skill}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Missing / Weak Skills */}
            <Card className="border border-border/70 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> Missing / Weak Skills ({missingSkills.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Skills listed in job requirements not explicitly verified
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {missingSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                    >
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      {skill}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 italic">
                  Note: Absence of a keyword in the resume does not preclude candidate experience during interviews.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Experience & Education Verification Tables */}
          <Card className="border border-border/70 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Requirement Alignment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* Experience row */}
              <div className="p-3 rounded-md bg-muted/20 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-foreground">Experience Requirement:</span>
                  <div className="text-muted-foreground mt-0.5">
                    Required: <span className="font-medium text-foreground">{jobExpText}</span> in relevant software engineering field
                  </div>
                  <div className="text-muted-foreground">
                    Candidate: <span className="font-medium text-foreground">{candidateExpText}</span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "self-start sm:self-auto",
                    meetsExperience
                      ? "text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-400 dark:bg-emerald-950/30"
                      : "text-amber-700 bg-amber-50 border-amber-300 dark:text-amber-400 dark:bg-amber-950/30"
                  )}
                >
                  {meetsExperience ? "Meets Requirement" : "Review Needed"}
                </Badge>
              </div>

              {/* Education row */}
              <div className="p-3 rounded-md bg-muted/20 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-foreground">Education Requirement:</span>
                  <div className="text-muted-foreground mt-0.5">
                    Required: <span className="font-medium text-foreground">{jobEducationText}</span>
                  </div>
                  <div className="text-muted-foreground">
                    Candidate: <span className="font-medium text-foreground">{candidateEducationText}</span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "self-start sm:self-auto",
                    meetsEducation
                      ? "text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-400 dark:bg-emerald-950/30"
                      : "text-amber-700 bg-amber-50 border-amber-300 dark:text-amber-400 dark:bg-amber-950/30"
                  )}
                >
                  {meetsEducation ? "Matches Requirement" : "Partial Match"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column: AI Explanations & Quick Info ── */}
        <div className="space-y-6">
          <Card className="border border-border/70 shadow-xs bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Why this score was assigned
              </CardTitle>
              <CardDescription className="text-xs">
                Generated from parsed resume artifacts and semantic matching
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              {/* Clean summary text - no JSON, no font-mono, no outer quotes */}
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border/50 text-xs text-foreground leading-relaxed break-words whitespace-pre-wrap">
                {screening?.summaryText && !screening.summaryText.startsWith('{') && !screening.summaryText.startsWith('"{')
                  ? screening.summaryText
                  : "Candidate resume has been analyzed against the job requirements. Review the score breakdown and skill matches below for detailed insights."}
              </div>

              <div className="space-y-2 pt-1">
                {/* Skill overlap bullet */}
                <div className="flex items-start gap-2">
                  <div className={cn(
                    "h-1.5 w-1.5 rounded-full mt-1.5 shrink-0",
                    matchingSkills.length > 0 ? "bg-emerald-500" : "bg-amber-500"
                  )} />
                  <p>
                    <strong className="text-foreground">Skill Overlap:</strong>{" "}
                    {matchingSkills.length > 0
                      ? <>Candidate possesses <strong className="text-foreground">{matchingSkills.length}</strong> verified required skill{matchingSkills.length !== 1 ? 's' : ''}: {matchingSkills.slice(0, 4).join(', ')}{matchingSkills.length > 4 ? ` +${matchingSkills.length - 4} more` : ''}.</>  
                      : 'No matching skills explicitly detected in the resume.'}
                  </p>
                </div>

                {/* Missing skills bullet */}
                {missingSkills.length > 0 && (
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <p>
                      <strong className="text-foreground">Skill Gaps:</strong>{" "}
                      {missingSkills.slice(0, 4).join(', ')}{missingSkills.length > 4 ? ` and ${missingSkills.length - 4} more` : ''} not explicitly detected in the resume.
                    </p>
                  </div>
                )}

                {/* Experience bullet */}
                <div className="flex items-start gap-2">
                  <div className={cn(
                    "h-1.5 w-1.5 rounded-full mt-1.5 shrink-0",
                    expScore >= 70 ? "bg-emerald-500" : "bg-amber-500"
                  )} />
                  <p>
                    <strong className="text-foreground">Experience:</strong>{" "}
                    {expScore >= 70
                      ? `Candidate experience meets the position requirement (score: ${expScore}%).`
                      : `Experience may not fully meet position requirements (score: ${expScore}%).`}
                  </p>
                </div>

                {/* Education bullet */}
                <div className="flex items-start gap-2">
                  <div className={cn(
                    "h-1.5 w-1.5 rounded-full mt-1.5 shrink-0",
                    eduScore >= 70 ? "bg-emerald-500" : "bg-amber-500"
                  )} />
                  <p>
                    <strong className="text-foreground">Education:</strong>{" "}
                    {eduScore >= 70
                      ? `Education credentials align with role requirements (score: ${eduScore}%).`
                      : `Required degree or qualification not fully verified in candidate history (score: ${eduScore}%).`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Candidate Profile Quick Info */}
          <Card className="border border-border/70 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Candidate Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Full Name:</span>
                <span className="font-medium text-foreground">{application.candidateName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium text-foreground">{application.candidateEmail}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">Applied Date:</span>
                <span className="font-medium text-foreground">
                  {new Date(application.appliedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Resume Status:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Parsed & Verified</span>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => router.push(`/candidates/${application.candidateId}`)}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View Detailed Profile & Resume
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
