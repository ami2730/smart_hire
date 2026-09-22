"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Users,
  Search,
  MapPin,
  Mail,
  Sparkles,
  FileText,
  Link2,
  Globe,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { candidatesApi, type Candidate } from "@/lib/api/candidates.api";
import { useAuth } from "@/lib/auth/auth-context";

// ── Recommendation badge ────────────────────────────────────────────────────

const RECOMMENDATION_STYLE: Record<string, { label: string; className: string }> = {
  STRONG_MATCH: {
    label: "Strong Match",
    className:
      "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900",
  },
  GOOD_MATCH: {
    label: "Good Match",
    className:
      "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-900",
  },
  MODERATE_MATCH: {
    label: "Moderate",
    className:
      "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-900",
  },
  LOW_MATCH: {
    label: "Low Match",
    className:
      "text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700",
  },
};

function getCandidateStatusDisplay(candidate: Candidate) {
  if (candidate.status === "HIRED" || candidate.latestApplicationStatus === "HIRED") {
    return {
      label: "Hired",
      className:
        "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900",
    };
  }
  if (candidate.status === "REJECTED" || candidate.latestApplicationStatus === "REJECTED") {
    return {
      label: "Rejected",
      className:
        "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/30 dark:border-rose-900",
    };
  }
  if (candidate.latestApplicationStatus) {
    const s = candidate.latestApplicationStatus;
    if (s === "SHORTLISTED") {
      return {
        label: "Shortlisted",
        className:
          "text-purple-700 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/30 dark:border-purple-900",
      };
    }
    if (s === "INTERVIEW") {
      return {
        label: "Interview",
        className:
          "text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/30 dark:border-indigo-900",
      };
    }
    if (s === "OFFERED") {
      return {
        label: "Offered",
        className:
          "text-teal-700 bg-teal-50 border-teal-200 dark:text-teal-400 dark:bg-teal-950/30 dark:border-teal-900",
      };
    }
    if (s === "SCREENING" || s === "UNDER_REVIEW") {
      return {
        label: "In Review",
        className:
          "text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-400 dark:bg-sky-950/30 dark:border-sky-900",
      };
    }
  }
  return {
    label: "Active",
    className:
      "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-900",
  };
}

function ScoreRing({ score }: { score: number }) {
  const size = 40;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 85
      ? "#10b981"
      : score >= 70
        ? "#3b82f6"
        : score >= 55
          ? "#f59e0b"
          : "#94a3b8";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
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
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

function CandidateCard({ candidate }: { candidate: Candidate }) {
  const rec =
    candidate.latestRecommendation &&
    RECOMMENDATION_STYLE[candidate.latestRecommendation];
  const statusBadge = getCandidateStatusDisplay(candidate);

  const fullName = candidate.fullName || (candidate as any).name || "Candidate";
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "C";

  // Compute total experience years safely
  const expYears = React.useMemo(() => {
    const list = candidate.experience || [];
    const total = list.reduce((acc, exp) => {
      const start = exp.startDate ? new Date(exp.startDate).getFullYear() : null;
      const end = exp.endDate
        ? new Date(exp.endDate).getFullYear()
        : exp.isCurrent
          ? new Date().getFullYear()
          : null;
      if (start && end) acc += Math.max(0, end - start);
      return acc;
    }, 0);
    return total;
  }, [candidate.experience]);

  const expList = candidate.experience || [];
  const latestExp = expList.find((e) => e.isCurrent) ?? expList[0];
  const latestEdu = (candidate.education || [])[0];

  return (
    <div className="group flex flex-col sm:flex-row gap-4 bg-card border border-border/60 rounded-xl p-4 hover:border-border hover:shadow-sm transition-all duration-150">
      {/* Avatar */}
      <div className="shrink-0">
        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
          {initials}
        </div>
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/candidates/${candidate.id}`}>
              <h3 className="text-sm font-semibold text-foreground leading-none group-hover:text-primary transition-colors hover:underline">
                {fullName}
              </h3>
            </Link>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3 shrink-0" />
                {candidate.email}
              </span>
              {candidate.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {candidate.location}
                </span>
              )}
              {candidate.linkedinUrl && (
                <a
                  href={candidate.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <Link2 className="h-3 w-3 shrink-0" />
                  LinkedIn
                </a>
              )}
              {candidate.portfolioUrl && (
                <a
                  href={candidate.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <Globe className="h-3 w-3 shrink-0" />
                  Portfolio
                </a>
              )}
            </div>
          </div>

          {/* Score ring */}
          {candidate.latestMatchScore !== undefined && (
            <ScoreRing score={candidate.latestMatchScore} />
          )}
        </div>

        {/* Current role + education */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {latestExp && (
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3 shrink-0" />
              {latestExp.jobTitle}{" "}
              <span className="text-foreground/60">@ {latestExp.company}</span>
              {latestExp.isCurrent && (
                <span className="ml-1 text-emerald-500 font-medium">· Current</span>
              )}
            </span>
          )}
          {latestEdu && (
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3 shrink-0" />
              {latestEdu.degree}
            </span>
          )}
          {expYears > 0 && (
            <span className="text-foreground/60">
              {expYears}yr{expYears !== 1 ? "s" : ""} exp.
            </span>
          )}
        </div>

        {/* Skills */}
        {candidate.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {candidate.skills.slice(0, 5).map((skill) => (
              <span
                key={skill.id}
                className="inline-flex items-center rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-foreground/70"
              >
                {skill.name}
                {skill.proficiency === "EXPERT" && (
                  <span className="ml-1 text-amber-500">★</span>
                )}
              </span>
            ))}
            {candidate.skills.length > 5 && (
              <span className="inline-flex items-center rounded-md border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                +{candidate.skills.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-2.5 pl-0 sm:pl-3 sm:border-l sm:border-border/40">
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
              statusBadge.className
            )}
          >
            {statusBadge.label}
          </span>
          {rec && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                rec.className
              )}
            >
              <Sparkles className="h-2.5 w-2.5" />
              {rec.label}
            </span>
          )}
        </div>
        {candidate.applicationCount !== undefined && (
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {candidate.applicationCount} application{candidate.applicationCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Filter Definitions ──────────────────────────────────────────────────────

const CANDIDATE_FILTERS = [
  { label: "All Candidates", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Top Matches", value: "TOP_MATCH" },
  { label: "Hired", value: "HIRED" },
  { label: "Rejected", value: "REJECTED" },
] as const;

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CandidatesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // Sync with URL search params (e.g. ?status=active or ?status=top_match)
  const initialStatus = (searchParams.get("status") || "ALL").toUpperCase();
  const [statusFilter, setStatusFilter] = React.useState<string>(
    ["ALL", "ACTIVE", "TOP_MATCH", "HIRED", "REJECTED"].includes(initialStatus)
      ? initialStatus
      : "ALL"
  );

  React.useEffect(() => {
    const fromUrl = searchParams.get("status");
    if (fromUrl) {
      const up = fromUrl.toUpperCase();
      if (["ALL", "ACTIVE", "TOP_MATCH", "HIRED", "REJECTED"].includes(up)) {
        setStatusFilter(up);
      }
    }
  }, [searchParams]);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch candidate list (client-side filters provide instant badge counts and 0ms filter tab switches)
  const { data, isLoading } = useQuery({
    queryKey: ["candidates", debouncedSearch],
    queryFn: () =>
      candidatesApi.list({
        search: debouncedSearch || undefined,
        limit: 100,
      }),
    enabled: user?.role !== "APPLICANT",
  });

  const handleFilterClick = (filterValue: string) => {
    setStatusFilter(filterValue);
    const params = new URLSearchParams(searchParams.toString());
    if (filterValue === "ALL") {
      params.delete("status");
    } else {
      params.set("status", filterValue.toLowerCase());
    }
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const allCandidates = data?.candidates ?? [];

  // Filter candidates client-side for immediate responsiveness
  const candidates = React.useMemo(() => {
    let list = allCandidates;

    if (statusFilter === "ACTIVE") {
      list = list.filter(
        (c) =>
          c.status === "ACTIVE" ||
          (!c.status &&
            c.latestApplicationStatus !== "HIRED" &&
            c.latestApplicationStatus !== "REJECTED")
      );
    } else if (statusFilter === "TOP_MATCH") {
      list = list.filter(
        (c) =>
          (c.latestMatchScore !== undefined && c.latestMatchScore >= 70) ||
          c.latestRecommendation === "STRONG_MATCH" ||
          c.latestRecommendation === "GOOD_MATCH"
      );
    } else if (statusFilter === "HIRED") {
      list = list.filter(
        (c) => c.status === "HIRED" || c.latestApplicationStatus === "HIRED"
      );
    } else if (statusFilter === "REJECTED") {
      list = list.filter(
        (c) => c.status === "REJECTED" || c.latestApplicationStatus === "REJECTED"
      );
    }

    return list;
  }, [allCandidates, statusFilter]);

  // Compute live tab counts
  const counts = React.useMemo(() => {
    return {
      ALL: allCandidates.length,
      ACTIVE: allCandidates.filter(
        (c) =>
          c.status === "ACTIVE" ||
          (!c.status &&
            c.latestApplicationStatus !== "HIRED" &&
            c.latestApplicationStatus !== "REJECTED")
      ).length,
      TOP_MATCH: allCandidates.filter(
        (c) =>
          (c.latestMatchScore !== undefined && c.latestMatchScore >= 70) ||
          c.latestRecommendation === "STRONG_MATCH" ||
          c.latestRecommendation === "GOOD_MATCH"
      ).length,
      HIRED: allCandidates.filter(
        (c) => c.status === "HIRED" || c.latestApplicationStatus === "HIRED"
      ).length,
      REJECTED: allCandidates.filter(
        (c) => c.status === "REJECTED" || c.latestApplicationStatus === "REJECTED"
      ).length,
    };
  }, [allCandidates]);

  if (user?.role === "APPLICANT") {
    return (
      <PageContainer title="Access Restricted">
        <Card>
          <CardContent className="py-20 text-center space-y-3">
            <ShieldCheck className="h-10 w-10 text-primary mx-auto" />
            <h3 className="text-base font-semibold text-foreground">Access Restricted</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Candidate browsing and talent pool management is reserved for recruiters and administrators.
            </p>
            <Link href="/dashboard" className="inline-block mt-2">
              <Button size="sm">Go to Applicant Portal</Button>
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Candidates"
      subtitle="Browse the talent pool, view parsed resume skills, and filter candidates by hiring pipeline status."
    >
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50 text-xs overflow-x-auto max-w-full">
          {CANDIDATE_FILTERS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleFilterClick(tab.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer whitespace-nowrap",
                statusFilter === tab.value
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{tab.label}</span>
              {counts[tab.value as keyof typeof counts] !== undefined && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full px-1 text-[10px] font-bold",
                    statusFilter === tab.value
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {counts[tab.value as keyof typeof counts]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, skill, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Candidate List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-muted/40 animate-pulse border border-border/40"
            />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <Card>
          <CardContent className="py-20 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {search
                ? "No matching candidates found"
                : statusFilter !== "ALL"
                ? `No ${statusFilter.replace("_", " ").toLowerCase()} candidates`
                : "No candidates yet"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {search
                ? `No candidates match "${search}". Try searching by a different name, skill, or location.`
                : statusFilter !== "ALL"
                ? `There are currently no candidates matching the "${statusFilter.replace("_", " ").toLowerCase()}" filter.`
                : "Candidates will appear here once resumes are submitted and parsed."}
            </p>
            {statusFilter !== "ALL" && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => handleFilterClick("ALL")}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground -mt-1">
            Showing <strong className="text-foreground">{candidates.length}</strong>{" "}
            {statusFilter !== "ALL" && (
              <>
                <span className="text-muted-foreground">
                  {statusFilter === "TOP_MATCH"
                    ? "top match"
                    : statusFilter.toLowerCase()}
                </span>{" "}
              </>
            )}
            of <strong className="text-foreground">{allCandidates.length}</strong> candidates
          </p>
          <div className="space-y-3">
            {candidates.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}
