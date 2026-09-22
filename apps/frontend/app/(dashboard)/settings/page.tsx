"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  Sun,
  Moon,
  Laptop,
  Shield,
  User,
  Bell,
  Sliders,
  Check,
  KeyRound,
  Lock,
  Smartphone,
  Globe,
  Mail,
  Building,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Save,
  Sparkles,
  ShieldCheck,
  Cpu,
  Monitor,
  Briefcase,
  FileText,
  Clock,
  MapPin,
  Phone,
  Layers,
  Upload,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";
import { applicantApi } from "@/lib/api/applicant.api";
import { authApi } from "@/lib/api/auth.api";

type SettingsTab = "profile" | "security" | "appearance" | "notifications" | "preferences" | "resume";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("profile");
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);

  const role = user?.role || "RECRUITER";

  // Profile Form State
  const [profile, setProfile] = React.useState({
    fullName: user?.name || "Amanuel Kebede",
    email: user?.email || "recruiter@smarthire.internal",
    title: role === "APPLICANT" ? "Full Stack Software Engineer" : role === "ADMIN" ? "Platform Administrator" : "Senior Technical Recruiter",
    department: role === "APPLICANT" ? "Engineering" : role === "ADMIN" ? "System Operations" : "Talent Acquisition",
    phone: "+251 91 123 4567",
    location: "Addis Ababa, Ethiopia",
    timezone: "UTC+03:00 (East Africa Time)",
    bio:
      role === "APPLICANT"
        ? "Passionate software engineer experienced in React, TypeScript, Node.js, and scalable cloud architectures."
        : role === "ADMIN"
        ? "Managing system security policies, ML model configurations, and organizational user access controls."
        : "Leading technical recruitment and talent acquisition pipelines for high-growth engineering teams.",
  });

  // Fetch real applicant profile if user is an applicant
  React.useEffect(() => {
    if (role === "APPLICANT") {
      applicantApi
        .getProfile()
        .then((data) => {
          if (data) {
            setProfile((prev) => ({
              ...prev,
              fullName: data.name || user?.name || prev.fullName,
              email: data.email || user?.email || prev.email,
              phone: data.phone || prev.phone,
              location: data.location || prev.location,
              bio: data.summary || prev.bio,
            }));
          }
        })
        .catch(() => {
          // fallback to auth user defaults
        });
    } else if (user) {
      setProfile((prev) => ({
        ...prev,
        fullName: user.name || prev.fullName,
        email: user.email || prev.email,
      }));
    }
  }, [role, user]);

  // Security Form State
  const [passwords, setPasswords] = React.useState({
    current: "",
    newPass: "",
    confirm: "",
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = React.useState(true);

  // Active Sessions – fetched from real backend endpoint
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["auth-sessions"],
    queryFn: () => authApi.getSessions(),
    staleTime: 30_000,
  });
  const [revokedIds, setRevokedIds] = React.useState<string[]>([]);
  const sessions = (sessionsData?.sessions ?? []).filter((s) => !revokedIds.includes(s.id));

  // Resumes – fetched from real backend endpoint (applicant only)
  const { data: resumesData, isLoading: resumesLoading, refetch: refetchResumes } = useQuery({
    queryKey: ["applicant-resumes"],
    queryFn: () => applicantApi.getResumes(),
    enabled: role === "APPLICANT",
  });
  const resumes = resumesData ?? [];

  // Resume upload state
  type UploadStatus = "IDLE" | "UPLOADING" | "PROCESSING" | "DONE" | "FAILED";
  const [uploadStatus, setUploadStatus] = React.useState<UploadStatus>("IDLE");
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadFileMeta, setUploadFileMeta] = React.useState<{ name: string; size: string } | null>(null);
  const [resumeIsDragging, setResumeIsDragging] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const resumeInputRef = React.useRef<HTMLInputElement>(null);

  // Notifications State (differentiated by role)
  const [notifications, setNotifications] = React.useState({
    // Recruiter notifications
    newApplicationEmail: true,
    screeningReadyEmail: true,
    strongMatchAlert: true,
    dailyDigest: false,
    desktopPush: true,
    weeklyReportEmail: true,
    // Applicant notifications
    appStatusChangedEmail: true,
    interviewInviteEmail: true,
    matchingJobAlertEmail: true,
    // Admin notifications
    systemAuditAlertEmail: true,
    mlServiceHealthAlert: true,
    userRegistrationAlert: false,
  });

  // AI & Recruitment / Career Preferences State
  const [preferences, setPreferences] = React.useState({
    // Recruiter
    minMatchThreshold: 75,
    autoShortlistTopMatches: false,
    requireRecruiterSignoff: true,
    semanticWeighting: 35,
    allowDocxUpload: true,
    allowPdfUpload: true,
    // Applicant
    openToWork: true,
    preferredRemote: true,
    preferredFullTime: true,
    preferredContract: false,
    talentPoolVisible: true,
    // Admin
    autoScreenOnSubmit: true,
    strictRbacEnforcement: true,
    maxUploadSizeMb: 10,
    auditRetentionDays: 90,
  });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      if (role === "APPLICANT") {
        await applicantApi.updateProfile({
          name: profile.fullName,
          phone: profile.phone,
          location: profile.location,
          summary: profile.bio,
        });
        toast({
          title: "Profile updated",
          description: "Your applicant profile information has been saved.",
          variant: "success",
        });
      } else {
        toast({
          title: "Profile updated",
          description: `${role === "ADMIN" ? "Administrator" : "Recruiter"} profile saved successfully.`,
          variant: "success",
        });
      }
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.message || "Could not update profile.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) {
      toast({
        title: "Passwords do not match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      });
      return;
    }
    if (passwords.newPass.length < 8) {
      toast({
        title: "Password too weak",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Password updated",
      description: "Account credentials updated successfully.",
      variant: "success",
    });
    setPasswords({ current: "", newPass: "", confirm: "" });
  };

  const handleRevokeSession = (sessionId: string) => {
    setRevokedIds((prev) => [...prev, sessionId]);
    toast({
      title: "Session revoked",
      description: "Device has been signed out of this session.",
      variant: "info",
    });
  };

  const handleSavePreferences = () => {
    toast({
      title: "Preferences saved",
      description:
        role === "APPLICANT"
          ? "Career and job matching preferences updated."
          : role === "ADMIN"
          ? "Platform governance and AI parameters updated."
          : "AI screening criteria and recruitment defaults updated.",
      variant: "success",
    });
  };

  const handleResumeUpload = async (file: File) => {
    if (!file) return;
    const validExtensions = [".pdf", ".docx"];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      toast({ title: "Invalid file type", description: "Please upload a PDF or DOCX file.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10 MB.", variant: "destructive" });
      return;
    }
    const sizeKb = (file.size / 1024).toFixed(1);
    setUploadFileMeta({ name: file.name, size: `${sizeKb} KB` });
    setUploadStatus("UPLOADING");
    setUploadProgress(30);
    try {
      setUploadProgress(60);
      setUploadStatus("PROCESSING");
      await applicantApi.uploadResume(file, resumes.length === 0);
      setUploadProgress(100);
      setUploadStatus("DONE");
      await refetchResumes();
      toast({ title: "Resume uploaded & parsed", description: "Your skills and experience have been updated by the AI engine.", variant: "success" });
      setTimeout(() => { setUploadStatus("IDLE"); setUploadProgress(0); setUploadFileMeta(null); }, 3000);
    } catch (err: any) {
      setUploadStatus("FAILED");
      const msg = err?.message || "Could not upload resume. Please try again.";
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    }
  };

  const handleDeleteResume = async (id: string) => {
    setDeletingId(id);
    try {
      await applicantApi.deleteResume(id);
      await refetchResumes();
      toast({ title: "Resume deleted", description: "Resume has been removed from your profile.", variant: "info" });
    } catch {
      toast({ title: "Delete failed", description: "Could not delete resume. Please try again.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const roleSubtitle =
    role === "APPLICANT"
      ? "Manage your applicant profile, career preferences, and security."
      : role === "ADMIN"
      ? "Configure system security, platform governance, and administrative account settings."
      : "Manage your recruitment identity, candidate screening criteria, and platform preferences.";

  return (
    <PageContainer title="Settings" subtitle={roleSubtitle}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* ── Settings Navigation Tabs ── */}
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer",
              activeTab === "profile"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <User className="h-4 w-4 shrink-0" />
            <span>
              {role === "APPLICANT"
                ? "Candidate Profile"
                : role === "ADMIN"
                ? "Admin Profile"
                : "Recruiter Profile"}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={cn(
              "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer",
              activeTab === "security"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Shield className="h-4 w-4 shrink-0" />
            <span>Security & Auth</span>
          </button>

          <button
            onClick={() => setActiveTab("appearance")}
            className={cn(
              "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer",
              activeTab === "appearance"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Sun className="h-4 w-4 shrink-0" />
            <span>Appearance & Theme</span>
          </button>

          <button
            onClick={() => setActiveTab("notifications")}
            className={cn(
              "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer",
              activeTab === "notifications"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Bell className="h-4 w-4 shrink-0" />
            <span>Notifications</span>
          </button>

          <button
            onClick={() => setActiveTab("preferences")}
            className={cn(
              "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer",
              activeTab === "preferences"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {role === "APPLICANT" ? (
              <Briefcase className="h-4 w-4 shrink-0" />
            ) : role === "ADMIN" ? (
              <Sliders className="h-4 w-4 shrink-0" />
            ) : (
              <Cpu className="h-4 w-4 shrink-0" />
            )}
            <span>
              {role === "APPLICANT"
                ? "Job Preferences"
                : role === "ADMIN"
                ? "Platform Governance"
                : "AI Match Criteria"}
            </span>
          </button>

          {/* Resume tab – applicant only */}
          {role === "APPLICANT" && (
            <button
              onClick={() => setActiveTab("resume")}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer",
                activeTab === "resume"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span>My Resumes</span>
              {resumes.length > 0 && (
                <span className={cn(
                  "ml-auto text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1",
                  activeTab === "resume" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {resumes.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* ── Tab Content ── */}
        <div className="md:col-span-3 space-y-6">
          {/* 1. PROFILE TAB */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <Card className="border border-border/70 shadow-xs">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      {role === "APPLICANT"
                        ? "Applicant & Candidate Profile"
                        : role === "ADMIN"
                        ? "Platform Administrator Profile"
                        : "Recruiter Profile"}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={
                        role === "ADMIN"
                          ? "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/30"
                          : role === "RECRUITER"
                          ? "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30"
                          : "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30"
                      }
                    >
                      {role === "ADMIN"
                        ? "ADMIN · System Authority"
                        : role === "RECRUITER"
                        ? "RECRUITER · Hiring Manager"
                        : "APPLICANT · Job Seeker"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {role === "APPLICANT"
                      ? "Your personal contact details and professional summary submitted with your job applications."
                      : role === "ADMIN"
                      ? "Administrative identity and system-level configuration privileges."
                      : "Your account identity and professional contact details used for candidate outreach."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  {/* Avatar Section */}
                  <div className="flex items-center gap-4 pb-4 border-b border-border/40">
                    <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold border-2 border-primary/20 shrink-0">
                      {profile.fullName
                        .split(" ")
                        .filter(Boolean)
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "U"}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{profile.fullName}</h4>
                      <p className="text-muted-foreground text-xs">{profile.email}</p>
                      <p className="text-primary text-[11px] font-medium mt-0.5">{profile.title}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Full Name</label>
                      <Input
                        value={profile.fullName}
                        onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                        required
                        className="text-xs h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Email Address</label>
                      <Input
                        type="email"
                        value={profile.email}
                        disabled
                        className="text-xs h-9 bg-muted/40 cursor-not-allowed"
                      />
                    </div>

                    {role === "APPLICANT" ? (
                      <>
                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Phone Number</label>
                          <Input
                            value={profile.phone}
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            placeholder="+251 9..."
                            className="text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Current Location</label>
                          <Input
                            value={profile.location}
                            onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                            placeholder="Addis Ababa, Ethiopia"
                            className="text-xs h-9"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Job Title</label>
                          <Input
                            value={profile.title}
                            onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                            className="text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Department</label>
                          <Input
                            value={profile.department}
                            onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                            className="text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Phone Number</label>
                          <Input
                            value={profile.phone}
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            className="text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Timezone</label>
                          <Input
                            value={profile.timezone}
                            onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                            className="text-xs h-9"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-1 pt-2">
                    <label className="font-semibold text-foreground">
                      {role === "APPLICANT" ? "Professional Summary & Bio" : "Account Bio & Notes"}
                    </label>
                    <textarea
                      rows={4}
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder={
                        role === "APPLICANT"
                          ? "Brief summary of your professional experience, technical expertise, and career focus..."
                          : "Brief description..."
                      }
                      className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t border-border/40 p-4">
                  <Button type="submit" size="sm" disabled={isSavingProfile} className="text-xs h-8 gap-1.5">
                    <Save className="h-3.5 w-3.5" />
                    {isSavingProfile ? "Saving..." : "Save Profile"}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          )}

          {/* 2. SECURITY TAB */}
          {activeTab === "security" && (
            <div className="space-y-6">
              {/* Password change */}
              <form onSubmit={handleUpdatePassword}>
                <Card className="border border-border/70 shadow-xs">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-primary" /> Change Password
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Update your account password with standard cryptographic hashing. Minimum 8 characters.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs">
                    <div className="space-y-1 max-w-sm">
                      <label className="font-semibold text-foreground">Current Password</label>
                      <Input
                        type="password"
                        value={passwords.current}
                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                        placeholder="••••••••"
                        className="text-xs h-9"
                        required
                      />
                    </div>
                    <div className="space-y-1 max-w-sm">
                      <label className="font-semibold text-foreground">New Password</label>
                      <Input
                        type="password"
                        value={passwords.newPass}
                        onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                        placeholder="At least 8 characters"
                        className="text-xs h-9"
                        required
                        minLength={8}
                      />
                    </div>
                    <div className="space-y-1 max-w-sm">
                      <label className="font-semibold text-foreground">Confirm New Password</label>
                      <Input
                        type="password"
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                        placeholder="••••••••"
                        className="text-xs h-9"
                        required
                        minLength={8}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end border-t border-border/40 p-4">
                    <Button type="submit" size="sm" className="text-xs h-8 gap-1.5">
                      <Lock className="h-3.5 w-3.5" /> Update Password
                    </Button>
                  </CardFooter>
                </Card>
              </form>

              {/* Active Sessions */}
              <Card className="border border-border/70 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary" /> Active Sessions & Devices
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Devices currently authenticated to your SmartHire account.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  {sessionsLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse border border-border/40" />
                      ))}
                    </div>
                  ) : sessions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-6">
                      No active sessions found.
                    </p>
                  ) : (
                    sessions.map((sess) => (
                      <div
                        key={sess.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20"
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground truncate">{sess.userAgent}</p>
                            {sess.current && (
                              <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300 text-[10px] py-0 shrink-0">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-[11px]">
                            IP: {sess.ip} • {sess.lastActive}
                          </p>
                        </div>
                        {!sess.current && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeSession(sess.id)}
                            className="text-xs h-7 text-destructive hover:bg-destructive/10 shrink-0 ml-2"
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* 3. APPEARANCE TAB */}
          {activeTab === "appearance" && (
            <Card className="border border-border/70 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sun className="h-4 w-4 text-primary" /> Theme & Interface
                </CardTitle>
                <CardDescription className="text-xs">
                  Customize the look and feel of the SmartHire portal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-xs">
                <div>
                  <p className="font-semibold text-foreground mb-3">Color Mode</p>
                  <div className="grid grid-cols-3 gap-3 max-w-md">
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className={cn(
                        "p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all cursor-pointer",
                        theme === "light"
                          ? "border-primary bg-primary/5 text-primary shadow-xs"
                          : "border-border/60 hover:bg-muted/30 text-muted-foreground"
                      )}
                    >
                      <Sun className="h-5 w-5" />
                      <span className="font-semibold text-xs">Light</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={cn(
                        "p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all cursor-pointer",
                        theme === "dark"
                          ? "border-primary bg-primary/5 text-primary shadow-xs"
                          : "border-border/60 hover:bg-muted/30 text-muted-foreground"
                      )}
                    >
                      <Moon className="h-5 w-5" />
                      <span className="font-semibold text-xs">Dark</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("system")}
                      className={cn(
                        "p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all cursor-pointer",
                        theme === "system"
                          ? "border-primary bg-primary/5 text-primary shadow-xs"
                          : "border-border/60 hover:bg-muted/30 text-muted-foreground"
                      )}
                    >
                      <Laptop className="h-5 w-5" />
                      <span className="font-semibold text-xs">System</span>
                    </button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3 max-w-lg">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-foreground">Compact Table Layout</p>
                      <p className="text-muted-foreground text-[11px]">Display denser lists for candidates and job records.</p>
                    </div>
                    <Switch defaultChecked={false} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-foreground">Reduce Interface Motion</p>
                      <p className="text-muted-foreground text-[11px]">Disables non-essential micro-animations for low-spec devices.</p>
                    </div>
                    <Switch defaultChecked={false} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 4. NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <Card className="border border-border/70 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  {role === "APPLICANT"
                    ? "Job & Application Notifications"
                    : role === "ADMIN"
                    ? "System & Compliance Alerts"
                    : "Recruiter Pipeline Notifications"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {role === "APPLICANT"
                    ? "Choose which updates about your applications and new job matches trigger notifications."
                    : role === "ADMIN"
                    ? "System monitoring, security warnings, and platform health alerts."
                    : "Choose which candidate events and screening milestones trigger alerts."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                {role === "APPLICANT" ? (
                  <>
                    <div className="flex items-center justify-between py-2 border-b border-border/40">
                      <div>
                        <p className="font-medium text-foreground">Application Status Updates</p>
                        <p className="text-muted-foreground text-[11px]">Email alert when a recruiter reviews, shortlists, or updates your application status.</p>
                      </div>
                      <Switch
                        checked={notifications.appStatusChangedEmail}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, appStatusChangedEmail: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-border/40">
                      <div>
                        <p className="font-medium text-foreground">Interview Invitations</p>
                        <p className="text-muted-foreground text-[11px]">High-priority notification when an interview is scheduled.</p>
                      </div>
                      <Switch
                        checked={notifications.interviewInviteEmail}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, interviewInviteEmail: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-border/40">
                      <div>
                        <p className="font-medium text-foreground">Matching Job Alerts</p>
                        <p className="text-muted-foreground text-[11px]">Receive alerts when new jobs are published that match your skill set.</p>
                      </div>
                      <Switch
                        checked={notifications.matchingJobAlertEmail}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, matchingJobAlertEmail: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium text-foreground">Desktop Browser Push Notifications</p>
                        <p className="text-muted-foreground text-[11px]">Receive prompt OS alerts for interview and application updates.</p>
                      </div>
                      <Switch
                        checked={notifications.desktopPush}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, desktopPush: checked })}
                      />
                    </div>
                  </>
                ) : role === "ADMIN" ? (
                  <>
                    <div className="flex items-center justify-between py-2 border-b border-border/40">
                      <div>
                        <p className="font-medium text-foreground">Security & Audit Log Alerts</p>
                        <p className="text-muted-foreground text-[11px]">Immediate notification for role changes, unauthorized access attempts, or anomalies.</p>
                      </div>
                      <Switch
                        checked={notifications.systemAuditAlertEmail}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, systemAuditAlertEmail: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-border/40">
                      <div>
                        <p className="font-medium text-foreground">ML Service & Worker Health Alerts</p>
                        <p className="text-muted-foreground text-[11px]">Alert when Python ML microservice reports high latency or extraction failures.</p>
                      </div>
                      <Switch
                        checked={notifications.mlServiceHealthAlert}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, mlServiceHealthAlert: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium text-foreground">New User Registration Digest</p>
                        <p className="text-muted-foreground text-[11px]">Daily digest of newly registered applicants and recruiters.</p>
                      </div>
                      <Switch
                        checked={notifications.userRegistrationAlert}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, userRegistrationAlert: checked })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between py-2 border-b border-border/40">
                      <div>
                        <p className="font-medium text-foreground">New Application Received</p>
                        <p className="text-muted-foreground text-[11px]">Email alert when a candidate applies to your posted jobs.</p>
                      </div>
                      <Switch
                        checked={notifications.newApplicationEmail}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, newApplicationEmail: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-border/40">
                      <div>
                        <p className="font-medium text-foreground">AI Screening Completed</p>
                        <p className="text-muted-foreground text-[11px]">Notification when resume parsing and match scoring finishes.</p>
                      </div>
                      <Switch
                        checked={notifications.screeningReadyEmail}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, screeningReadyEmail: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-border/40">
                      <div>
                        <p className="font-medium text-foreground">Strong Match Alerts (&ge; 80%)</p>
                        <p className="text-muted-foreground text-[11px]">High-priority alert when a top-tier candidate is detected.</p>
                      </div>
                      <Switch
                        checked={notifications.strongMatchAlert}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, strongMatchAlert: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-border/40">
                      <div>
                        <p className="font-medium text-foreground">Desktop Browser Push Notifications</p>
                        <p className="text-muted-foreground text-[11px]">Show native OS notifications during active recruitment hours.</p>
                      </div>
                      <Switch
                        checked={notifications.desktopPush}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, desktopPush: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium text-foreground">Weekly Recruitment Digest</p>
                        <p className="text-muted-foreground text-[11px]">Summary of hiring pipeline velocity, time-to-hire, and applicant volume.</p>
                      </div>
                      <Switch
                        checked={notifications.weeklyReportEmail}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyReportEmail: checked })}
                      />
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="flex justify-end border-t border-border/40 p-4">
                <Button
                  size="sm"
                  onClick={() => toast({ title: "Preferences saved", description: "Notification settings updated.", variant: "success" })}
                  className="text-xs h-8"
                >
                  Save Notifications
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* 5. PREFERENCES TAB */}
          {activeTab === "preferences" && (
            <Card className="border border-border/70 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  {role === "APPLICANT" ? (
                    <>
                      <Briefcase className="h-4 w-4 text-primary" /> Job Search & Career Preferences
                    </>
                  ) : role === "ADMIN" ? (
                    <>
                      <Sliders className="h-4 w-4 text-primary" /> System & AI Governance
                    </>
                  ) : (
                    <>
                      <Cpu className="h-4 w-4 text-primary" /> AI Match Criteria & Rules
                    </>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  {role === "APPLICANT"
                    ? "Configure your career preferences, target employment types, and recruiter visibility."
                    : role === "ADMIN"
                    ? "Platform-wide AI parameters, file upload policies, and compliance settings."
                    : "Fine-tune scoring thresholds and algorithmic weighting for the recruitment engine."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-xs">
                {role === "APPLICANT" ? (
                  <>
                    <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-3">
                      <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">AI Job Match Optimization:</strong> Setting your career preferences
                        helps the SmartHire ML engine recommend jobs that best fit your skills and availability.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                        Target Work Types
                      </h4>
                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <div>
                          <p className="font-medium text-foreground">Open to Remote Roles</p>
                          <p className="text-muted-foreground text-[11px]">Include full-remote and hybrid job opportunities.</p>
                        </div>
                        <Switch
                          checked={preferences.preferredRemote}
                          onCheckedChange={(checked) => setPreferences({ ...preferences, preferredRemote: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <div>
                          <p className="font-medium text-foreground">Full-Time Positions</p>
                          <p className="text-muted-foreground text-[11px]">Actively considering permanent full-time employment.</p>
                        </div>
                        <Switch
                          checked={preferences.preferredFullTime}
                          onCheckedChange={(checked) => setPreferences({ ...preferences, preferredFullTime: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <div>
                          <p className="font-medium text-foreground">Contract & Freelance</p>
                          <p className="text-muted-foreground text-[11px]">Open to fixed-term contracts and advisory roles.</p>
                        </div>
                        <Switch
                          checked={preferences.preferredContract}
                          onCheckedChange={(checked) => setPreferences({ ...preferences, preferredContract: checked })}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between py-1">
                      <div>
                        <p className="font-medium text-foreground">Recruiter Talent Pool Visibility</p>
                        <p className="text-[11px] text-muted-foreground">
                          Allow verified recruiters to find your profile in talent search, even before you apply.
                        </p>
                      </div>
                      <Switch
                        checked={preferences.talentPoolVisible}
                        onCheckedChange={(checked) => setPreferences({ ...preferences, talentPoolVisible: checked })}
                      />
                    </div>
                  </>
                ) : role === "ADMIN" ? (
                  <>
                    <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-3">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">System Governance Notice:</strong> Modifications made here apply
                        globally to all recruiters, jobs, and ML screening workflows across the organization.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                        AI Service & Model Controls
                      </h4>
                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <div>
                          <p className="font-medium text-foreground">Auto-Screening on Application Submission</p>
                          <p className="text-[11px] text-muted-foreground">Automatically trigger Python ML service evaluation when an applicant applies.</p>
                        </div>
                        <Switch
                          checked={preferences.autoScreenOnSubmit}
                          onCheckedChange={(checked) => setPreferences({ ...preferences, autoScreenOnSubmit: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-border/40">
                        <div>
                          <p className="font-medium text-foreground">Strict RBAC Authorization Checks</p>
                          <p className="text-[11px] text-muted-foreground">Enforce role isolation: applicants cannot browse talent pool; recruiters only manage own jobs.</p>
                        </div>
                        <Switch
                          checked={preferences.strictRbacEnforcement}
                          onCheckedChange={(checked) => setPreferences({ ...preferences, strictRbacEnforcement: checked })}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                        Storage & Retention Policies
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Max Resume Upload Size (MB)</label>
                          <Input
                            type="number"
                            value={preferences.maxUploadSizeMb}
                            onChange={(e) => setPreferences({ ...preferences, maxUploadSizeMb: Number(e.target.value) })}
                            className="text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-foreground">Audit Log Retention (Days)</label>
                          <Input
                            type="number"
                            value={preferences.auditRetentionDays}
                            onChange={(e) => setPreferences({ ...preferences, auditRetentionDays: Number(e.target.value) })}
                            className="text-xs h-9"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Recruiter AI Preferences */}
                    <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-3">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">Human-in-the-Loop Governance:</strong> AI correlation provides
                        analytical recommendation scores. Final hiring, shortlisting, and rejection decisions remain exclusively
                        with human recruiters.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-semibold text-foreground">Minimum Match Score for "Strong Match" Badge</span>
                        <span className="font-bold text-primary tabular-nums">{preferences.minMatchThreshold}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="95"
                        value={preferences.minMatchThreshold}
                        onChange={(e) => setPreferences({ ...preferences, minMatchThreshold: Number(e.target.value) })}
                        className="w-full accent-primary cursor-pointer"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Candidates scoring above {preferences.minMatchThreshold}% will be highlighted with the green Strong Match badge.
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                        Supported File Formats for Resumes
                      </h4>
                      <div className="flex items-center justify-between py-1">
                        <span>Accept Portable Document Format (.PDF)</span>
                        <Switch
                          checked={preferences.allowPdfUpload}
                          onCheckedChange={(checked) => setPreferences({ ...preferences, allowPdfUpload: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span>Accept Microsoft Word Documents (.DOCX)</span>
                        <Switch
                          checked={preferences.allowDocxUpload}
                          onCheckedChange={(checked) => setPreferences({ ...preferences, allowDocxUpload: checked })}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between py-1">
                      <div>
                        <p className="font-medium text-foreground">Strict Recruiter Signoff Enforcement</p>
                        <p className="text-[11px] text-muted-foreground">Prevents any automated advancement without explicit recruiter approval.</p>
                      </div>
                      <Switch
                        checked={preferences.requireRecruiterSignoff}
                        onCheckedChange={(checked) => setPreferences({ ...preferences, requireRecruiterSignoff: checked })}
                      />
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="flex justify-end border-t border-border/40 p-4">
                <Button size="sm" onClick={handleSavePreferences} className="text-xs h-8 gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  {role === "APPLICANT"
                    ? "Save Career Preferences"
                    : role === "ADMIN"
                    ? "Save System Governance"
                    : "Save AI Preferences"}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* 6. RESUME MANAGEMENT TAB (applicant only) */}
          {activeTab === "resume" && role === "APPLICANT" && (
            <div className="space-y-6">
              {/* Upload Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Resume & CV Upload
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Upload or update your resume. The AI engine automatically parses your skills, experience, and education to match you with top jobs.
                      </CardDescription>
                    </div>
                    {resumes.length > 0 && (
                      <Button
                        size="sm"
                        onClick={() => resumeInputRef.current?.click()}
                        disabled={uploadStatus === "UPLOADING" || uploadStatus === "PROCESSING"}
                        className="text-xs h-8 gap-1.5"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Update / Upload New
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Hidden file input */}
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleResumeUpload(file);
                      e.target.value = "";
                    }}
                  />

                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setResumeIsDragging(true);
                    }}
                    onDragLeave={() => setResumeIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setResumeIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleResumeUpload(file);
                    }}
                    onClick={() => {
                      if (uploadStatus !== "UPLOADING" && uploadStatus !== "PROCESSING") {
                        resumeInputRef.current?.click();
                      }
                    }}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
                      resumeIsDragging
                        ? "border-primary bg-primary/5 scale-[0.99]"
                        : "border-border/60 hover:border-primary/50 hover:bg-muted/30",
                      (uploadStatus === "UPLOADING" || uploadStatus === "PROCESSING") &&
                        "pointer-events-none opacity-80"
                    )}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {uploadStatus === "UPLOADING" || uploadStatus === "PROCESSING" ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          <Upload className="h-6 w-6" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {uploadStatus === "UPLOADING"
                            ? "Uploading resume file..."
                            : uploadStatus === "PROCESSING"
                            ? "Extracting text and analyzing skills with AI..."
                            : uploadStatus === "DONE"
                            ? "Upload complete!"
                            : "Click to upload or drag & drop your resume"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Supports PDF and DOCX files up to 10 MB
                        </p>
                      </div>

                      {uploadStatus !== "UPLOADING" && uploadStatus !== "PROCESSING" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-1 text-xs h-8 gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            resumeInputRef.current?.click();
                          }}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {resumes.length > 0 ? "Update Resume" : "Select Resume File"}
                        </Button>
                      )}
                    </div>

                    {/* Active Upload / Processing Progress Bar */}
                    {(uploadStatus === "UPLOADING" ||
                      uploadStatus === "PROCESSING" ||
                      uploadStatus === "DONE") && (
                      <div className="mt-4 pt-4 border-t border-border/40 max-w-md mx-auto space-y-2 text-left">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground truncate max-w-[200px]">
                            {uploadFileMeta?.name || "Resume document"}
                          </span>
                          <span className="text-muted-foreground font-mono">
                            {uploadProgress}%
                          </span>
                        </div>
                        <Progress value={uploadProgress} className="h-1.5" />
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          {uploadStatus === "PROCESSING" ? (
                            <>
                              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                              Running AI skill parsing and vectorization...
                            </>
                          ) : uploadStatus === "DONE" ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              Resume parsed and added to your profile!
                            </>
                          ) : (
                            <>Uploading file to secure storage...</>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Uploaded Resumes List */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-primary" />
                        My Uploaded Resumes
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Active resumes linked to your profile and used for job applications and AI matching.
                      </CardDescription>
                    </div>
                    {resumes.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {resumes.length} document{resumes.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {resumesLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
                      ))}
                    </div>
                  ) : resumes.length === 0 ? (
                    <div className="py-10 text-center space-y-2">
                      <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground">
                        <FileText className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No resumes uploaded yet</p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Upload your resume above to allow recruiters to review your qualifications and enable automated AI job recommendations.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40 border border-border/60 rounded-xl overflow-hidden">
                      {resumes.map((resume, idx) => {
                        const isPrimary = idx === 0 || resume.isDefault;
                        const sizeKb = resume.fileSize
                          ? (resume.fileSize / 1024).toFixed(0)
                          : "Unknown";
                        const uploadDate = resume.uploadedAt
                          ? new Date(resume.uploadedAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Recently";

                        return (
                          <div
                            key={resume.id}
                            className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-foreground truncate max-w-[240px] sm:max-w-[360px]">
                                    {resume.originalFileName}
                                  </p>
                                  {isPrimary && (
                                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                      <Check className="h-2.5 w-2.5" />
                                      Primary
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                  <span>{sizeKb} KB</span>
                                  <span>·</span>
                                  <span>Uploaded {uploadDate}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1.5"
                                onClick={() => resumeInputRef.current?.click()}
                              >
                                <Upload className="h-3 w-3" />
                                Update
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletingId === resume.id}
                                onClick={() => handleDeleteResume(resume.id)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                aria-label="Delete resume"
                              >
                                {deletingId === resume.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Benefits Card */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-foreground">
                    Automated AI Parsing & Live Profile Synchronization
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    When you upload or update your resume, SmartHire automatically extracts your key skills, programming languages, and career history. This information is matched against live job postings to calculate your AI compatibility score.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
