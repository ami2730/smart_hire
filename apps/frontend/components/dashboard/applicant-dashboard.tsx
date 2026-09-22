"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Building2,
  MapPin,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { applicantApi, ApplicantApplication } from "@/lib/api/applicant.api";
import { jobsApi, Job } from "@/lib/api/jobs.api";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  SUBMITTED: {
    label: "Submitted",
    className: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30",
    icon: Clock,
  },
  SCREENING: {
    label: "In Screening",
    className: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30",
    icon: Sparkles,
  },
  UNDER_REVIEW: {
    label: "Under Review",
    className: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30",
    icon: Clock,
  },
  INTERVIEW: {
    label: "Interview Scheduled",
    className: "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/30",
    icon: Sparkles,
  },
  OFFERED: {
    label: "Offer Extended",
    className: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Not Selected",
    className: "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30",
    icon: AlertCircle,
  },
  WITHDRAWN: {
    label: "Withdrawn",
    className: "text-slate-500 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-900/40",
    icon: AlertCircle,
  },
};

export function ApplicantDashboard() {
  const { user } = useAuth();

  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ["applicant", "my-applications"],
    queryFn: () => applicantApi.getApplications(),
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ["jobs", "public-feed"],
    queryFn: () => jobsApi.list({ status: "ACTIVE", limit: 4 }),
  });

  const activeApps = applications.filter(
    (a) => a.status !== "WITHDRAWN" && a.status !== "REJECTED"
  );
  const interviewsOrOffers = applications.filter(
    (a) => a.status === "INTERVIEW" || a.status === "OFFERED"
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 relative overflow-hidden">
        <div className="max-w-2xl space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Applicant Portal</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {user?.name?.split(" ")[0] || "Applicant"}!
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Track your job applications, explore open opportunities aligned with your skills, and stay updated on hiring progress.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">My Applications</p>
              <p className="text-2xl font-bold text-foreground">{applications.length}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Active in Process</p>
              <p className="text-2xl font-bold text-foreground">{activeApps.length}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Interviews & Offers</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {interviewsOrOffers.length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Available Jobs</p>
              <p className="text-2xl font-bold text-foreground">
                {jobsData?.pagination?.total ?? jobsData?.jobs?.length ?? 0}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Briefcase className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Submissions */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
              <div>
                <CardTitle className="text-base font-semibold">My Applications</CardTitle>
                <CardDescription className="text-xs">
                  Review the progress of your submitted job applications
                </CardDescription>
              </div>
              <Link href="/applications">
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary">
                  <span>View all</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/40">
              {appsLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Loading applications...
                </div>
              ) : applications.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="h-10 w-10 mx-auto rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <FileText className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No applications yet</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Browse published positions and apply with your resume to start tracking your progress here.
                  </p>
                  <Link href="/jobs">
                    <Button size="sm" className="mt-2 text-xs">
                      Explore Open Jobs
                    </Button>
                  </Link>
                </div>
              ) : (
                applications.slice(0, 5).map((app) => {
                  const statusCfg = STATUS_MAP[app.status] || STATUS_MAP.SUBMITTED;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <div
                      key={app.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="space-y-1">
                        <Link
                          href={`/jobs/${app.job.id}`}
                          className="text-sm font-semibold text-foreground hover:text-primary hover:underline transition-colors block"
                        >
                          {app.job.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {app.job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {app.job.location}
                            </span>
                          )}
                          {app.job.employmentType && <span>{app.job.employmentType}</span>}
                          <span>
                            Applied {new Date(app.appliedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold",
                            statusCfg.className
                          )}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusCfg.label}
                        </span>
                        <Link href={`/jobs/${app.job.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View Job">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Featured Jobs */}
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
              <div>
                <CardTitle className="text-base font-semibold">Open Positions</CardTitle>
                <CardDescription className="text-xs">Recommended jobs accepting applications</CardDescription>
              </div>
              <Link href="/jobs">
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary">
                  <span>Browse</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {jobsLoading ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Loading jobs...
                </div>
              ) : (jobsData?.jobs ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No active openings currently available. Check back soon!
                </p>
              ) : (
                (jobsData?.jobs ?? []).map((job) => (
                  <div
                    key={job.id}
                    className="p-3 rounded-xl border border-border/50 bg-card hover:border-primary/40 hover:bg-muted/20 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="text-xs font-bold text-foreground hover:text-primary transition-colors line-clamp-1"
                      >
                        {job.title}
                      </Link>
                      <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
                        {job.employmentType || "Full-time"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.location}
                        </span>
                      )}
                      {job.minimumExperienceYears && (
                        <span>{job.minimumExperienceYears}+ yrs exp</span>
                      )}
                    </div>
                    {job.requiredSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {job.requiredSkills.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.requiredSkills.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{job.requiredSkills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    <div className="pt-1">
                      <Link href={`/jobs/${job.id}`}>
                        <Button size="sm" variant="outline" className="w-full text-xs h-7 gap-1">
                          <span>View Role & Apply</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
