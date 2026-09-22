"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  Sparkles,
  BarChart3,
  Settings,
  ChevronDown,
  Award,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth/auth-context";

interface NavSubItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  subItems?: NavSubItem[];
}

interface NavGroup {
  groupTitle?: string;
  items: NavItem[];
}

const recruiterGroups: NavGroup[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    groupTitle: "Recruitment",
    items: [
      {
        label: "Jobs",
        href: "/jobs",
        icon: Briefcase,
      },
      {
        label: "Candidates",
        href: "/candidates",
        icon: Users,
      },
      {
        label: "Applications",
        href: "/applications",
        icon: FileText,
      },
    ],
  },
  {
    groupTitle: "AI Intelligence",
    items: [
      {
        label: "AI Screening",
        href: "/screening",
        icon: Sparkles,
        badge: "AI",
        subItems: [
          { label: "Screening", href: "/screening" },
          { label: "Rankings", href: "/ranking", icon: Award },
          { label: "Match Results", href: "/screening?tab=matches", icon: SlidersHorizontal },
        ],
      },
    ],
  },
  {
    groupTitle: "Management",
    items: [
      {
        label: "Reports",
        href: "/reports",
        icon: BarChart3,
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];

const applicantGroups: NavGroup[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    groupTitle: "Job Search",
    items: [
      {
        label: "Browse Jobs",
        href: "/jobs",
        icon: Briefcase,
      },
      {
        label: "My Applications",
        href: "/applications",
        icon: FileText,
      },
    ],
  },
  {
    groupTitle: "Account",
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onItemClick?: () => void; // for mobile drawer close
}

export function AppSidebar({ collapsed, onToggleCollapse, onItemClick }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const navigationGroups = user?.role === "APPLICANT" ? applicantGroups : recruiterGroups;

  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    "AI Screening": true,
  });

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isItemActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "relative flex flex-col h-full bg-card border-r border-border/80 transition-all duration-300 select-none z-30",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border/80">
          {!collapsed ? (
            <Link
              href="/dashboard"
              onClick={onItemClick}
              className="flex items-center gap-2.5 font-bold tracking-tight text-foreground transition-opacity hover:opacity-90"
            >
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm shadow-primary/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-base font-semibold tracking-tight text-foreground">
                  SmartHire
                </span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                  AI Screening
                </span>
              </div>
            </Link>
          ) : (
            <div className="mx-auto">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
          )}

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navigationGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!collapsed && group.groupTitle && (
                <div className="px-2.5 mb-1.5 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                  {group.groupTitle}
                </div>
              )}

              {group.items.map((item) => {
                const active = isItemActive(item.href);
                const hasSub = !collapsed && item.subItems && item.subItems.length > 0;
                const isSubOpen = openSections[item.label] ?? false;
                const Icon = item.icon;

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          onClick={onItemClick}
                          className={cn(
                            "flex h-10 w-10 mx-auto items-center justify-center rounded-lg transition-colors",
                            active
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          <span className="sr-only">{item.label}</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium text-xs">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <div key={item.label} className="space-y-1">
                    <div
                      className={cn(
                        "group relative flex items-center justify-between rounded-lg text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Link
                        href={item.href}
                        onClick={onItemClick}
                        className="flex items-center gap-3 flex-1 min-w-0 px-3 py-2"
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-primary/20 text-primary uppercase">
                            {item.badge}
                          </span>
                        )}
                      </Link>

                      {hasSub && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSection(item.label);
                          }}
                          className="mr-2 p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                          aria-label={`Toggle ${item.label} submenu`}
                        >
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform duration-200",
                              isSubOpen && "rotate-180"
                            )}
                          />
                        </button>
                      )}
                    </div>

                    {/* Submenu */}
                    {hasSub && isSubOpen && item.subItems && (
                      <div className="pl-6 pr-1 py-1 space-y-1 border-l border-border/60 ml-4">
                        {item.subItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive = pathname === sub.href;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={onItemClick}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                                isSubActive
                                  ? "text-primary font-semibold bg-primary/10"
                                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
                              )}
                            >
                              {SubIcon && <SubIcon className="h-3 w-3 shrink-0" />}
                              <span className="truncate">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border/80">
          {!collapsed ? (
            <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5 border border-border/50 text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-muted-foreground font-medium text-[11px]">
                  Engine Active
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                <span>v1.0</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
