"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Users,
  Briefcase,
  FileText,
  Sparkles,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Building2,
  Lock,
  Unlock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminApi, AdminUser } from "@/lib/api/admin.api";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: () => adminApi.getReports(),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminApi.getUsers({ limit: 10 }),
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: () => adminApi.getAuditLogs({ limit: 8 }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      adminApi.updateUserStatus(userId, isActive),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
      toast({
        title: vars.isActive ? "User Activated" : "User Deactivated",
        description: `Account has been updated successfully.`,
        variant: "success",
      });
    },
    onError: () => toast({ title: "Failed to update user", variant: "error" }),
  });

  const overview = reportsData?.overview;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 relative overflow-hidden">
        <div className="max-w-2xl space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Admin Portal</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Platform Administration & Governance
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Manage user accounts across recruiters and applicants, oversee job listings, view audit logs, and monitor recruitment throughput.
          </p>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold text-foreground">
                {overview?.totalUsers ?? (usersData?.pagination?.total || 0)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {overview?.totalRecruiters ?? 0} recruiters · {overview?.totalApplicants ?? 0} applicants
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Platform Jobs</p>
              <p className="text-2xl font-bold text-foreground">{overview?.totalJobs ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Active and draft listings</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Briefcase className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Candidate Applications</p>
              <p className="text-2xl font-bold text-foreground">{overview?.totalApplications ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Submitted applications</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">AI Screenings</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {overview?.totalScreenings ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground">ML evaluations completed</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: User Management & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: User Management */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
              <div>
                <CardTitle className="text-base font-semibold">Platform Users</CardTitle>
                <CardDescription className="text-xs">
                  Inspect user accounts and toggle active status
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/40">
              {usersLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Loading platform users...
                </div>
              ) : (usersData?.users ?? []).length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No users found.
                </div>
              ) : (
                (usersData?.users ?? []).map((u: AdminUser) => (
                  <div
                    key={u.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{u.name}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.2",
                            u.role === "ADMIN"
                              ? "border-red-300 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20"
                              : u.role === "RECRUITER"
                              ? "border-blue-300 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20"
                              : "border-emerald-300 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                          )}
                        >
                          {u.role}
                        </Badge>
                        <span
                          className={cn(
                            "text-[10px] font-medium px-1.5 py-0.2 rounded",
                            u.isActive
                              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                              : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
                          )}
                        >
                          {u.isActive ? "Active" : "Deactivated"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>

                    {u.role !== "ADMIN" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={toggleStatusMutation.isPending}
                        onClick={() =>
                          toggleStatusMutation.mutate({
                            userId: u.id,
                            isActive: !u.isActive,
                          })
                        }
                        className={cn(
                          "h-8 text-xs gap-1.5",
                          u.isActive
                            ? "text-destructive hover:bg-destructive/10 border-destructive/30"
                            : "text-emerald-600 hover:bg-emerald-50 border-emerald-300"
                        )}
                      >
                        {u.isActive ? (
                          <>
                            <Lock className="h-3.5 w-3.5" />
                            <span>Deactivate</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3.5 w-3.5" />
                            <span>Activate</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Security & Audit Trail */}
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
              <div>
                <CardTitle className="text-base font-semibold">Security Audit Trail</CardTitle>
                <CardDescription className="text-xs">
                  Latest platform events & actions
                </CardDescription>
              </div>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {auditLoading ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Loading logs...
                </div>
              ) : (auditData?.logs ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No security events recorded.
                </p>
              ) : (
                (auditData?.logs ?? []).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg border border-border/50 bg-muted/20 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold font-mono text-[11px] text-foreground">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Resource: <span className="font-medium text-foreground">{log.resource}</span>
                      {log.resourceId && ` · ${log.resourceId.slice(0, 8)}...`}
                    </p>
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
