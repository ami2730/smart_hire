"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Legend,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  Users,
  Briefcase,
  Sparkles,
  Download,
  Calendar,
  ArrowUpRight,
  Target,
  Loader2,
  FileText,
} from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { reportsApi } from "@/lib/api/reports.api";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/auth-context";
import { downloadReportPdf } from "@/lib/utils/export-report-pdf";

// ── Utility ─────────────────────────────────────────────────────────────────

const CHART_COLORS = {
  primary: "#3b82f6",
  emerald: "#10b981",
  amber: "#f59e0b",
  violet: "#8b5cf6",
  slate: "#94a3b8",
  red: "#ef4444",
};

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "11px",
  color: "var(--foreground)",
};

// ── Recruitment Funnel Data ─────────────────────────────────────────────────

const FUNNEL_DATA = [
  { stage: "Applied", count: 640, color: CHART_COLORS.slate },
  { stage: "Screened", count: 512, color: CHART_COLORS.primary },
  { stage: "Shortlisted", count: 184, color: CHART_COLORS.violet },
  { stage: "Interviewed", count: 72, color: CHART_COLORS.amber },
  { stage: "Offered", count: 28, color: CHART_COLORS.emerald },
  { stage: "Hired", count: 18, color: "#059669" },
];

const DEPARTMENT_DATA = [
  { department: "Engineering", jobs: 12, applicants: 380, hires: 8 },
  { department: "AI/ML", jobs: 4, applicants: 95, hires: 2 },
  { department: "Product", jobs: 3, applicants: 60, hires: 3 },
  { department: "Infrastructure", jobs: 3, applicants: 75, hires: 2 },
  { department: "Data", jobs: 2, applicants: 30, hires: 0 },
  { department: "Mobile", jobs: 2, applicants: 55, hires: 3 },
];

const SKILL_DEMAND_DATA = [
  { skill: "TypeScript", demand: 85, supply: 62 },
  { skill: "React", demand: 78, supply: 70 },
  { skill: "Python", demand: 72, supply: 48 },
  { skill: "Node.js", demand: 90, supply: 65 },
  { skill: "AWS", demand: 68, supply: 40 },
  { skill: "Docker", demand: 65, supply: 55 },
  { skill: "PostgreSQL", demand: 60, supply: 58 },
  { skill: "Kubernetes", demand: 55, supply: 30 },
];

const WEEKLY_TRENDS = [
  { week: "Aug W1", applications: 58, screenings: 48, hires: 2 },
  { week: "Aug W2", applications: 72, screenings: 65, hires: 3 },
  { week: "Aug W3", applications: 88, screenings: 78, hires: 1 },
  { week: "Aug W4", applications: 95, screenings: 88, hires: 4 },
  { week: "Sep W1", applications: 134, screenings: 120, hires: 5 },
];

const TIME_TO_HIRE_DATA = [
  { month: "Apr", days: 28 },
  { month: "May", days: 24 },
  { month: "Jun", days: 22 },
  { month: "Jul", days: 19 },
  { month: "Aug", days: 16 },
  { month: "Sep", days: 14 },
];

// ── KPI Chip ────────────────────────────────────────────────────────────────

function KpiChip({
  label,
  value,
  change,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <span
          className={cn(
            "text-[10px] font-semibold flex items-center gap-0.5",
            trend === "up"
              ? "text-emerald-600 dark:text-emerald-400"
              : trend === "down"
                ? "text-red-500"
                : "text-muted-foreground"
          )}
        >
          {trend === "up" && <ArrowUpRight className="h-3 w-3" />}
          {change}
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Custom Tooltip ──────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={CUSTOM_TOOLTIP_STYLE} className="px-3 py-2 shadow-md">
      <p className="font-semibold mb-1 text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-muted-foreground capitalize">
            {p.name}: <strong className="text-foreground">{p.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [periodFilter, setPeriodFilter] = React.useState<"30d" | "90d" | "6m" | "1y">("30d");
  const [isExporting, setIsExporting] = React.useState(false);

  const { data: overview } = useQuery({
    queryKey: ["reports-overview"],
    queryFn: () => reportsApi.getOverview(),
  });

  const { data: analytics } = useQuery({
    queryKey: ["reports-analytics"],
    queryFn: () => reportsApi.getDashboardAnalytics(),
  });

  const metrics = overview ?? { totalJobs: 0, activeJobs: 0, totalCandidates: 0, totalApplications: 0, totalScreenings: 0, averageMatchScore: 0 };
  const screeningDist = analytics?.screeningDistribution ?? [];
  const scoreDist = analytics?.scoreDistribution ?? [];

  const conversionRate =
    metrics.totalApplications > 0
      ? ((metrics.totalScreenings / metrics.totalApplications) * 100).toFixed(1)
      : "0.0";

  const handleExportPdf = () => {
    try {
      setIsExporting(true);
      downloadReportPdf({
        period: periodFilter,
        generatedBy: user?.name || "Talent Acquisition Team",
        overview: metrics,
        screeningDistribution: screeningDist,
        scoreDistribution: scoreDist,
        funnelData: FUNNEL_DATA,
        departmentData: DEPARTMENT_DATA,
        skillData: SKILL_DEMAND_DATA,
      });

      toast({
        title: "Report Exported",
        description: "Your recruitment and AI screening PDF report has been generated and saved.",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: err?.message || "Failed to generate report PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <PageContainer
      title="Analytics & Reports"
      subtitle="Comprehensive recruitment performance metrics, talent insights, and AI screening analytics."
      actions={
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting}
          onClick={handleExportPdf}
          className="gap-1.5 font-medium hover:bg-primary/5 hover:text-primary transition-all shadow-xs cursor-pointer"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Export Report (PDF)</span>
            </>
          )}
        </Button>
      }
    >
      {/* Period Selector */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/50 text-xs self-start">
        {(["30d", "90d", "6m", "1y"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodFilter(p)}
            className={cn(
              "px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer",
              periodFilter === p
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p === "30d" ? "30 Days" : p === "90d" ? "90 Days" : p === "6m" ? "6 Months" : "1 Year"}
          </button>
        ))}
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiChip
          label="Total Jobs"
          value={metrics.totalJobs}
          change="+4 drafts"
          trend="neutral"
          icon={Briefcase}
        />
        <KpiChip
          label="Active Jobs"
          value={metrics.activeJobs}
          change="+12%"
          trend="up"
          icon={Target}
        />
        <KpiChip
          label="Candidates"
          value={metrics.totalCandidates}
          change="+28 this week"
          trend="up"
          icon={Users}
        />
        <KpiChip
          label="Applications"
          value={metrics.totalApplications}
          change="+15%"
          trend="up"
          icon={BarChart3}
        />
        <KpiChip
          label="Screened"
          value={metrics.totalScreenings}
          change={`${conversionRate}% rate`}
          trend="up"
          icon={Sparkles}
        />
        <KpiChip
          label="Avg Match Score"
          value={`${metrics.averageMatchScore}%`}
          change="Top 96%"
          trend="up"
          icon={TrendingUp}
        />
      </div>

      {/* Row 1: Trends + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 border-b border-border/40">
            <SectionHeader
              title="Weekly Recruitment Volume"
              description="Applications, screenings, and hires over the past 5 weeks"
            />
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={WEEKLY_TRENDS}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorScreenings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 10, color: "var(--muted-foreground)" }}
                />
                <Area
                  type="monotone"
                  dataKey="applications"
                  name="Applications"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  fill="url(#colorApps)"
                />
                <Area
                  type="monotone"
                  dataKey="screenings"
                  name="Screenings"
                  stroke={CHART_COLORS.emerald}
                  strokeWidth={2}
                  fill="url(#colorScreenings)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Screening Distribution */}
        <Card>
          <CardHeader className="pb-3 border-b border-border/40">
            <SectionHeader
              title="AI Match Distribution"
              description="Candidate recommendation tiers"
            />
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={screeningDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {screeningDist.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number, name: string, props: any) => [
                    `${val} (${props.payload.percentage}%)`,
                    props.payload.name,
                  ]}
                  contentStyle={CUSTOM_TOOLTIP_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2 mt-1">
              {screeningDist.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-semibold text-foreground">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Funnel + Score Dist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recruitment Funnel */}
        <Card>
          <CardHeader className="pb-3 border-b border-border/40">
            <SectionHeader
              title="Hiring Funnel"
              description="Candidate conversion across pipeline stages"
            />
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={FUNNEL_DATA} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="stage"
                  type="category"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Candidates" radius={[0, 4, 4, 0]}>
                  {FUNNEL_DATA.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <Card>
          <CardHeader className="pb-3 border-b border-border/40">
            <SectionHeader
              title="Candidate Score Distribution"
              description="Match score frequency across all evaluated candidates"
            />
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreDist}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>
                  {scoreDist.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Department + Skill Gap + Time-to-Hire */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Department Performance */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 border-b border-border/40">
            <SectionHeader
              title="Recruitment by Department"
              description="Jobs posted, applicants, and hires per department"
            />
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={DEPARTMENT_DATA}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="department"
                  tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 10, color: "var(--muted-foreground)" }}
                />
                <Bar dataKey="applicants" name="Applicants" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="hires" name="Hires" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Time-to-Hire Trend */}
        <Card>
          <CardHeader className="pb-3 border-b border-border/40">
            <SectionHeader
              title="Time-to-Hire"
              description="Average days from apply to hire"
            />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-3xl font-bold text-foreground">14</span>
              <span className="text-sm text-muted-foreground">days avg</span>
              <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" /> -50% vs Apr
              </span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={TIME_TO_HIRE_DATA}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[10, 32]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="days"
                  name="Days"
                  stroke={CHART_COLORS.emerald}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.emerald, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Skill Demand vs Supply */}
      <Card>
        <CardHeader className="pb-3 border-b border-border/40">
          <SectionHeader
            title="Skill Demand vs Candidate Supply"
            description="Market demand compared to available candidate skills in the current talent pool"
          />
        </CardHeader>
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={SKILL_DEMAND_DATA}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="skill"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 10, color: "var(--muted-foreground)" }}
              />
              <Bar
                dataKey="demand"
                name="Job Demand"
                fill={CHART_COLORS.primary}
                radius={[4, 4, 0, 0]}
                fillOpacity={0.85}
              />
              <Bar
                dataKey="supply"
                name="Candidate Supply"
                fill={CHART_COLORS.emerald}
                radius={[4, 4, 0, 0]}
                fillOpacity={0.85}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
