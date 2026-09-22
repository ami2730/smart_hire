"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  jobs: "Jobs",
  new: "Create Job",
  candidates: "Candidates",
  applications: "Applications",
  screening: "AI Screening",
  rankings: "Rankings",
  reports: "Reports",
  settings: "Settings",
};

export function Breadcrumb({ className }: { className?: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return (
      <div className={cn("flex items-center text-sm font-medium text-foreground", className)}>
        <span>Dashboard</span>
      </div>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center space-x-1.5 text-sm", className)}>
      <Link
        href="/dashboard"
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">Dashboard</span>
      </Link>

      {segments.map((segment, index) => {
        const path = `/${segments.slice(0, index + 1).join("/")}`;
        const isLast = index === segments.length - 1;
        const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

        return (
          <React.Fragment key={path}>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-foreground truncate max-w-[200px]" aria-current="page">
                {label}
              </span>
            ) : (
              <Link
                href={path}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[150px]"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
