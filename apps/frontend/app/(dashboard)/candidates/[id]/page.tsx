"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Link2,
  Globe,
  GraduationCap,
  Briefcase,
  Zap,
  FileText,
  TrendingUp,
  Sparkles,
  Upload,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Star,
  Eye,
  Download,
  Check,
  FileCheck,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { candidatesApi, type Candidate, type CandidateSkill } from "@/lib/api/candidates.api";
import { applicationsApi, type Application } from "@/lib/api/applications.api";
import { useAuth } from "@/lib/auth/auth-context";
import { useToast } from "@/components/ui/toast";

// ── Proficiency Badge ───────────────────────────────────────────────────────

const PROF_CONFIG: Record<string, { label: string; className: string; stars: number }> = {
  EXPERT: { label: "Expert", className: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-900", stars: 4 },
  ADVANCED: { label: "Advanced", className: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-900", stars: 3 },
  INTERMEDIATE: { label: "Intermediate", className: "text-violet-600 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-950/30 dark:border-violet-900", stars: 2 },
  BEGINNER: { label: "Beginner", className: "text-slate-500 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700", stars: 1 },
};

function SkillTag({ skill }: { skill: CandidateSkill }) {
  const prof = skill.proficiency ? PROF_CONFIG[skill.proficiency] : null;
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-2">
      <span className="text-sm font-medium text-foreground">{skill.name}</span>
      {prof && (
        <span className={cn("text-[10px] font-semibold rounded px-1.5 py-0.5 border", prof.className)}>
          {prof.label}
        </span>
      )}
    </div>
  );
}

// ── Score Gauge ─────────────────────────────────────────────────────────────

function ScoreGauge({ score, size = 64 }: { score: number; size?: number }) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 85 ? "#10b981" : score >= 70 ? "#3b82f6" : score >= 55 ? "#f59e0b" : "#94a3b8";
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/30" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

// ── Resume Upload Zone ──────────────────────────────────────────────────────

// ── Resume Upload Zone (Phase 7 Specification) ──────────────────────────────

type UploadStatus = "IDLE" | "UPLOADING" | "PROCESSING" | "PROCESSED" | "FAILED";

function ResumeUploadZone({ candidateId }: { candidateId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = React.useState(false);
  const [status, setStatus] = React.useState<UploadStatus>("IDLE");
  const [progress, setProgress] = React.useState<number>(0);
  const [fileMeta, setFileMeta] = React.useState<{ name: string; size: string } | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;
    const validExtensions = [".pdf", ".docx"];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      toast({ title: "Invalid file type", description: "Please upload a PDF or DOCX file.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }

    const sizeKb = (file.size / 1024).toFixed(1);
    setFileMeta({ name: file.name, size: `${sizeKb} KB` });
    setStatus("UPLOADING");
    setProgress(30);

    try {
      const formData = new FormData();
      formData.append("resume", file);
      const token = typeof window !== "undefined" ? localStorage.getItem("smarthire_access_token") : null;
      setProgress(60);
      setStatus("PROCESSING");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/candidates/${candidateId}/resumes`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      setProgress(100);
      setStatus("PROCESSED");
      await queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] });
      toast({
        title: "Resume uploaded & parsed",
        description: "Candidate profile and skill inventory have been updated by the ML engine.",
        variant: "success",
      });
    } catch {
      setStatus("FAILED");
      toast({
        title: "Processing error",
        description: "Could not parse resume formatting. Please check the file.",
        variant: "destructive",
      });
    }
  };

  const resetUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStatus("IDLE");
    setProgress(0);
    setFileMeta(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
      }}
      onClick={() => status === "IDLE" && inputRef.current?.click()}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-all",
        status === "IDLE" ? "cursor-pointer hover:border-primary/40 hover:bg-muted/30" : "cursor-default",
        isDragging ? "border-primary bg-primary/5" : "border-border/50",
        status === "PROCESSED" && "border-emerald-500/40 bg-emerald-500/[0.02]"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />

      {status === "IDLE" && (
        <>
          <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Upload Resume</p>
            <p className="text-xs text-muted-foreground mt-1">
              Drag & drop PDF or DOCX — or click to browse
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-1">Max 10 MB • Formats: PDF, DOCX</p>
          </div>
        </>
      )}

      {(status === "UPLOADING" || status === "PROCESSING") && (
        <div className="w-full max-w-xs space-y-3 py-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground truncate max-w-[180px]">{fileMeta?.name}</span>
            <span className="text-muted-foreground text-[11px]">{fileMeta?.size}</span>
          </div>

          <Progress value={progress} className="h-2" />

          <div className="flex items-center justify-center gap-2 text-xs font-medium text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{status === "UPLOADING" ? "Uploading file..." : "NLP extracting skills & credentials..."}</span>
          </div>
        </div>
      )}

      {status === "PROCESSED" && (
        <div className="w-full space-y-3 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">{fileMeta?.name}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  Processed & Verified • {fileMeta?.size}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={resetUpload} className="h-7 text-xs text-muted-foreground">
              Upload New
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Candidate skills and experience have been synchronized with the latest parsed resume.
          </p>
        </div>
      )}

      {status === "FAILED" && (
        <div className="flex flex-col items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <p className="text-xs font-medium text-destructive">Parsing failed</p>
          <Button variant="outline" size="sm" onClick={resetUpload} className="text-xs h-7">
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Download Candidate Resume File Helper ───────────────────────────────────

async function downloadCandidateResume(resumeId: string, filename?: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("smarthire_access_token") : null;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
  const response = await fetch(`${apiUrl}/resumes/${resumeId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "resume.pdf";
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// ── Resume Viewer Dialog (Spec 18) ───────────────────────────────────────────

interface ResumeViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate;
  totalExpYears: number;
  candidateScore: number | null;
  candidateRec: string | null;
}

function ResumeViewerDialog({
  open,
  onOpenChange,
  candidate,
  totalExpYears,
  candidateScore,
  candidateRec,
}: ResumeViewerDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState<"parsed" | "raw">("parsed");
  const [isDownloading, setIsDownloading] = React.useState(false);

  const primaryResume = candidate.resumes?.[0];
  const extractedText = primaryResume?.extractedText || candidate.resumeText;

  const handleDownload = async () => {
    if (!primaryResume?.id) {
      toast({
        title: "No resume file available",
        description: "This candidate has no uploaded resume file attached.",
        variant: "info",
      });
      return;
    }

    setIsDownloading(true);
    try {
      await downloadCandidateResume(primaryResume.id, primaryResume.originalFileName);
      toast({
        title: "Resume downloaded",
        description: `Successfully downloaded ${primaryResume.originalFileName}.`,
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err?.message || "Could not download resume from server.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 border-b border-border/50 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Resume Viewer — {candidate.fullName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {primaryResume?.originalFileName ? (
                <span>File: <strong className="text-foreground">{primaryResume.originalFileName}</strong> • Status: <strong className="text-emerald-600">{primaryResume.processingStatus}</strong></span>
              ) : (
                "Verified by SmartHire NLP Parser"
              )}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2 mr-6">
            <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("parsed")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer",
                  activeTab === "parsed" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Parsed View
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("raw")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer",
                  activeTab === "raw" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Extracted NLP Text
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isDownloading || !primaryResume?.id}
              onClick={handleDownload}
              className="text-xs h-8"
            >
              {isDownloading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1.5" />
              )}
              Download Resume
            </Button>
          </div>
        </DialogHeader>

        {/* Split Screen Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto min-h-[500px]">
          {/* Left Column (8 cols) */}
          <div className="md:col-span-8 p-6 bg-slate-50 dark:bg-slate-950/40 border-r border-border/40 font-sans space-y-6 overflow-y-auto">
            {activeTab === "raw" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-primary">Raw Extracted Document Text</h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Parsed via Python ML Text Extraction Engine</p>
                  </div>
                  {extractedText && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        navigator.clipboard.writeText(extractedText);
                        toast({ title: "Copied", description: "Extracted resume text copied to clipboard." });
                      }}
                    >
                      Copy Text
                    </Button>
                  )}
                </div>
                {extractedText ? (
                  <pre className="p-4 rounded-lg bg-card border border-border/70 text-xs font-mono text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-[480px] overflow-y-auto select-text">
                    {extractedText}
                  </pre>
                ) : (
                  <div className="p-8 text-center rounded-lg border border-dashed border-border/70 text-muted-foreground text-xs">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-foreground">No raw extracted text recorded</p>
                    <p className="text-[11px] mt-1">Upload a PDF or DOCX resume to trigger automated text extraction by the ML pipeline.</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Document Header */}
                <div className="border-b border-border/60 pb-4">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">{candidate.fullName}</h1>
                  <p className="text-xs text-muted-foreground mt-1">
                    {candidate.experience.find((e) => e.isCurrent)?.jobTitle || "Software Engineer"} • {candidate.location || "Addis Ababa"}
                  </p>
                  <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mt-2">
                    <span>{candidate.email}</span>
                    {candidate.phone && <span>• {candidate.phone}</span>}
                    {candidate.linkedinUrl && <span>• linkedin.com/in/{candidate.fullName.toLowerCase().replace(/\s+/g, "")}</span>}
                  </div>
                </div>

                {/* Professional Summary */}
                <div className="space-y-1.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-primary">Professional Summary</h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {candidate.summary || "No professional summary provided."}
                  </p>
                </div>

                {/* Work Experience */}
                <div className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-primary">Professional Experience</h2>
                  <div className="space-y-4">
                    {candidate.experience.map((exp) => (
                      <div key={exp.id} className="space-y-1">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-bold text-foreground">{exp.jobTitle}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {exp.startDate ? new Date(exp.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""} —{" "}
                            {exp.isCurrent ? "Present" : exp.endDate ? new Date(exp.endDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""}
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-foreground/80">{exp.company}</div>
                        {exp.description && (
                          <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Education */}
                <div className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-primary">Education & Credentials</h2>
                  <div className="space-y-2">
                    {candidate.education.map((edu) => (
                      <div key={edu.id} className="flex justify-between items-baseline text-xs">
                        <div>
                          <span className="font-semibold text-foreground">{edu.degree} in {edu.fieldOfStudy}</span>
                          <div className="text-[11px] text-muted-foreground">{edu.institution}</div>
                        </div>
                        {edu.graduationYear && (
                          <span className="text-[10px] text-muted-foreground">{edu.graduationYear}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Extracted Skills */}
                <div className="space-y-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-primary">Parsed Skill Inventory</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((s) => (
                      <span
                        key={s.id}
                        className="px-2 py-0.5 rounded-sm bg-background border border-border/60 text-[10px] font-medium text-foreground"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Column: Candidate Metadata & AI Match Summary (4 cols) */}
          <div className="md:col-span-4 p-5 bg-card space-y-5 text-xs">
            <div>
              <span className="font-semibold text-foreground text-xs uppercase tracking-wider">Candidate Score</span>
              <div className="mt-2 flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <div>
                  <div className="text-2xl font-extrabold text-primary tabular-nums">
                    {candidateScore !== null ? `${candidateScore}%` : "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">AI Match Score</div>
                </div>
                {candidateRec ? (
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300">
                    {candidateRec.replace("_", " ")}
                  </Badge>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Pending Evaluation</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-semibold text-foreground text-xs uppercase tracking-wider">Resume Metadata</span>
              <div className="space-y-2 text-muted-foreground">
                <div className="flex justify-between">
                  <span>File Name:</span>
                  <span className="font-medium text-foreground truncate max-w-[140px]">{primaryResume?.originalFileName || "None"}</span>
                </div>
                <div className="flex justify-between">
                  <span>File Size:</span>
                  <span className="font-medium text-foreground">{primaryResume?.fileSize ? `${Math.round(primaryResume.fileSize / 1024)} KB` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Uploaded:</span>
                  <span className="font-medium text-foreground">{primaryResume?.uploadedAt ? new Date(primaryResume.uploadedAt).toLocaleDateString() : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>ML Status:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{primaryResume?.processingStatus || "NOT_UPLOADED"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Experience:</span>
                  <span className="font-medium text-foreground">{totalExpYears} years</span>
                </div>
                <div className="flex justify-between">
                  <span>Skills:</span>
                  <span className="font-medium text-foreground">{candidate.skills.length} verified</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="rounded-md bg-muted/40 p-3 text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Verified Document: </span>
              Internal document served directly from backend storage.
            </div>

            <Button
              variant="default"
              size="sm"
              className="w-full text-xs"
              onClick={() => onOpenChange(false)}
            >
              Close Viewer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Application History Row ─────────────────────────────────────────────────

function AppHistoryRow({ app }: { app: Application }) {
  const scoreColor = (app.matchScore ?? 0) >= 85 ? "text-emerald-600 dark:text-emerald-400"
    : (app.matchScore ?? 0) >= 70 ? "text-blue-600 dark:text-blue-400"
    : (app.matchScore ?? 0) >= 55 ? "text-amber-600 dark:text-amber-400"
    : "text-slate-500";

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{app.jobTitle}</p>
        <p className="text-xs text-muted-foreground">
          Applied {new Date(app.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-3">
        {app.matchScore !== null && app.matchScore !== undefined && (
          <span className={cn("text-sm font-bold tabular-nums", scoreColor)}>{app.matchScore}%</span>
        )}
        <span className="text-[10px] font-medium text-muted-foreground capitalize px-2 py-0.5 rounded-md border border-border/50 bg-muted/30">
          {app.status.toLowerCase().replace("_", " ")}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CandidateDetailPage() {
  const params = useParams();
  const candidateId = params?.id as string;
  const { user } = useAuth();

  // ── All hooks must be declared before any conditional returns ──
  const [isResumeOpen, setIsResumeOpen] = React.useState(false);

  const { data: candidate, isLoading } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: () => candidatesApi.getById(candidateId),
    enabled: !!candidateId,
  });

  const { data: appsData } = useQuery({
    queryKey: ["applications", "candidate", candidateId],
    queryFn: () => applicationsApi.list({ candidateId, limit: 20 }),
    enabled: !!candidateId,
  });

  if (isLoading) {
    return (
      <PageContainer title="Candidate Profile">
        <div className="space-y-4">
          <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="h-60 rounded-xl bg-muted/40 animate-pulse" />
            <div className="lg:col-span-2 h-60 rounded-xl bg-muted/40 animate-pulse" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!candidate) {
    return (
      <PageContainer title="Candidate Not Found">
        <Card>
          <CardContent className="py-20 text-center">
            <p className="text-muted-foreground text-sm">This candidate profile could not be found.</p>
            <Link href="/candidates" className="mt-4 inline-block">
              <Button variant="outline" size="sm">← Back to Candidates</Button>
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  // Enforce privacy: an applicant cannot inspect another applicant's profile
  if (
    user?.role === "APPLICANT" &&
    candidate.email !== user.email &&
    (candidate as any).userId !== user.id
  ) {
    return (
      <PageContainer title="Access Restricted">
        <Card>
          <CardContent className="py-20 text-center space-y-3">
            <ShieldCheck className="h-10 w-10 text-primary mx-auto" />
            <h3 className="text-base font-semibold text-foreground">Access Restricted</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You can only view your own applicant profile and submitted applications.
            </p>
            <Link href="/dashboard" className="inline-block mt-2">
              <Button size="sm">Return to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const applications = appsData?.applications ?? [];
  // Only the applicant who owns this profile can upload resumes
  const isOwnProfile =
    user?.role === "APPLICANT" &&
    (candidate.email === user.email || (candidate as any).userId === user.id);
  const latestScreenedApp = applications.find(
    (a) => a.latestScreening || (a.matchScore !== null && a.matchScore !== undefined)
  );
  const candidateScore =
    candidate.latestMatchScore ??
    (latestScreenedApp?.matchScore !== null && latestScreenedApp?.matchScore !== undefined
      ? latestScreenedApp.matchScore
      : null);
  const candidateRec =
    candidate.latestRecommendation ??
    latestScreenedApp?.recommendation ??
    null;
  const totalExpYears = candidate.experience.reduce((acc, exp) => {
    const start = exp.startDate ? new Date(exp.startDate).getFullYear() : null;
    const end = exp.endDate ? new Date(exp.endDate).getFullYear() : exp.isCurrent ? new Date().getFullYear() : null;
    if (start && end) acc += end - start;
    return acc;
  }, 0);

  const expertSkills = candidate.skills.filter((s) => s.proficiency === "EXPERT");
  const otherSkills = candidate.skills.filter((s) => s.proficiency !== "EXPERT");

  return (
    <PageContainer
      title={candidate.fullName}
      subtitle={candidate.email}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsResumeOpen(true)}
            className="gap-1.5 text-xs h-8"
          >
            <Eye className="h-3.5 w-3.5" />
            View Resume
          </Button>
          <Link href="/candidates">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          </Link>
        </div>
      }
    >
      <ResumeViewerDialog
        open={isResumeOpen}
        onOpenChange={setIsResumeOpen}
        candidate={candidate}
        totalExpYears={totalExpYears}
        candidateScore={candidateScore}
        candidateRec={candidateRec}
      />

      {/* Profile header card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Avatar */}
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/25 to-primary/5 border-2 border-primary/20 flex items-center justify-center text-xl font-bold text-primary shrink-0">
              {candidate.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">{candidate.fullName}</h2>
                {candidate.experience.find((e) => e.isCurrent) && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {candidate.experience.find((e) => e.isCurrent)?.jobTitle} @{" "}
                    <strong className="font-medium text-foreground">
                      {candidate.experience.find((e) => e.isCurrent)?.company}
                    </strong>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{candidate.email}</span>
                {candidate.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{candidate.phone}</span>}
                {candidate.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{candidate.location}</span>}
                {candidate.linkedinUrl && (
                  <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                    <Link2 className="h-3.5 w-3.5" />LinkedIn
                  </a>
                )}
                {candidate.portfolioUrl && (
                  <a href={candidate.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                    <Globe className="h-3.5 w-3.5" />Portfolio
                  </a>
                )}
              </div>
            </div>

            {/* Score + rec badge + View Resume CTA */}
            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              {candidateScore !== null ? (
                <div className="flex flex-col items-center sm:items-end gap-1">
                  <ScoreGauge score={candidateScore} size={64} />
                  {candidateRec && (
                    <span className="text-[10px] font-semibold text-primary">
                      {candidateRec.replace("_", " ")}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">AI Score</span>
                </div>
              ) : (
                <div className="flex flex-col items-center sm:items-end gap-0.5 text-xs text-muted-foreground">
                  <span className="text-xs font-semibold text-foreground/80">Pending</span>
                  <span className="text-[10px]">No Screening Yet</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResumeOpen(true)}
                className="text-xs h-7 gap-1"
              >
                <FileText className="h-3 w-3 text-primary" /> View Resume
              </Button>
            </div>
          </div>

          {/* Quick stats row */}
          <Separator className="my-4" />
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5 text-primary" />
              <span><strong className="text-foreground">{totalExpYears}</strong> yrs experience</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span><strong className="text-foreground">{candidate.skills.length}</strong> skills</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span><strong className="text-foreground">{applications.length}</strong> applications</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5 text-primary" />
              <span><strong className="text-foreground">{candidate.education.length}</strong> education records</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Three-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column: Resume upload + Applications */}
        <div className="space-y-5">
          {/* Resume Upload & Uploaded Files */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Resume & Documents
              </CardTitle>
              {candidate.resumes && candidate.resumes.length > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {candidate.resumes.length} file{candidate.resumes.length > 1 ? "s" : ""}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {candidate.resumes && candidate.resumes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Uploaded Files
                  </p>
                  {candidate.resumes.map((res) => (
                    <div
                      key={res.id}
                      className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {res.originalFileName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {Math.round(res.fileSize / 1024)} KB • {new Date(res.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className={
                            res.processingStatus === "PROCESSED"
                              ? "text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/50 text-[10px] py-0"
                              : "text-blue-700 bg-blue-50 border-blue-300 text-[10px] py-0"
                          }
                        >
                          {res.processingStatus}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="Download Resume"
                          onClick={() => downloadCandidateResume(res.id, res.originalFileName)}
                        >
                          <Download className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {isOwnProfile ? (
                <>
                  <ResumeUploadZone candidateId={candidate.id} />
                  <p className="text-[10px] text-muted-foreground text-center">
                    Uploading parses the resume and auto-updates candidate skills via the AI engine.
                  </p>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-center space-y-1">
                  <Upload className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    Resume upload is done by the candidate from their own account.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Application History */}
          {applications.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Application History
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 px-4 pb-2">
                {applications.map((app) => (
                  <AppHistoryRow key={app.id} app={app} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right columns: Skills + Experience + Education */}
        <div className="lg:col-span-2 space-y-5">
          {/* Skills */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-primary" />
                Skills ({candidate.skills.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {expertSkills.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" /> Expert Level
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {expertSkills.map((s) => <SkillTag key={s.id} skill={s} />)}
                  </div>
                </div>
              )}
              {otherSkills.length > 0 && (
                <div>
                  {expertSkills.length > 0 && (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Other Skills
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {otherSkills.map((s) => <SkillTag key={s.id} skill={s} />)}
                  </div>
                </div>
              )}
              {candidate.skills.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No skills found. Upload a resume to auto-extract skills.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Experience */}
          {candidate.experience.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                  Work Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-5">
                  {candidate.experience.map((exp, idx) => (
                    <div key={exp.id} className="flex gap-4">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center">
                        <div className={cn("h-3 w-3 rounded-full border-2 mt-0.5 shrink-0", exp.isCurrent ? "border-emerald-500 bg-emerald-500" : "border-border bg-background")} />
                        {idx < candidate.experience.length - 1 && (
                          <div className="w-px flex-1 bg-border/60 mt-1" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{exp.jobTitle}</p>
                            <p className="text-xs text-muted-foreground font-medium">{exp.company}</p>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {exp.startDate ? new Date(exp.startDate).getFullYear() : "?"} –{" "}
                              {exp.isCurrent ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Present</span>
                              ) : (
                                exp.endDate ? new Date(exp.endDate).getFullYear() : "?"
                              )}
                            </span>
                          </div>
                        </div>
                        {exp.description && (
                          <p className="text-xs text-foreground/70 mt-1.5 leading-relaxed">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Education */}
          {candidate.education.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {candidate.education.map((edu) => (
                    <div key={edu.id} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{edu.degree}</p>
                        <p className="text-xs text-muted-foreground">{edu.institution}</p>
                        {edu.fieldOfStudy && (
                          <p className="text-xs text-muted-foreground/70">{edu.fieldOfStudy}</p>
                        )}
                        {(edu.startYear || edu.endYear) && (
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {edu.startYear} – {edu.endYear ?? "Present"}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
