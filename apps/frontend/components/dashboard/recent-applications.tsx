import * as React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Clock, CheckCircle2 } from "lucide-react";
import { RecentApplication } from "@/lib/api/reports.api";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface RecentApplicationsProps {
  applications: RecentApplication[];
}

export function RecentApplications({ applications }: RecentApplicationsProps) {
  const getStatusBadge = (status: RecentApplication["status"]) => {
    switch (status) {
      case "STRONG_MATCH":
        return (
          <Badge variant="success" className="text-[11px] gap-1 font-medium">
            <Sparkles className="h-3 w-3" />
            <span>Strong Match</span>
          </Badge>
        );
      case "SCREENED":
        return (
          <Badge variant="secondary" className="text-[11px] gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3 text-blue-500" />
            <span>Screened</span>
          </Badge>
        );
      case "UNDER_REVIEW":
        return (
          <Badge variant="outline" className="text-[11px] font-medium">
            Under Review
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[11px]">
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="divide-y divide-border/60">
      {applications.map((app) => {
        const initials = app.candidateName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase();

        return (
          <div
            key={app.id}
            className="flex items-center justify-between p-3.5 hover:bg-accent/40 transition-colors group"
          >
            {/* Candidate & Role */}
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9 border-border/80">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-0.5">
                <Link
                  href={`/candidates/${app.candidateId}`}
                  className="text-xs sm:text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block"
                >
                  {app.candidateName}
                </Link>
                <p className="text-[11px] text-muted-foreground truncate">{app.jobTitle}</p>
              </div>
            </div>

            {/* Score, Status, Date */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0 pl-2">
              <div className="text-right hidden sm:block">
                <div className="flex items-center justify-end gap-1">
                  <span className="text-sm font-bold text-foreground">{app.matchScore}%</span>
                  <span className="text-[10px] text-muted-foreground">match</span>
                </div>
                <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  <span>{app.timeAgo}</span>
                </div>
              </div>

              <div>{getStatusBadge(app.status)}</div>

              <Link
                href={`/applications/${app.id}/screening`}
                className="p-1 rounded text-muted-foreground group-hover:text-primary hover:bg-accent transition-colors"
                aria-label={`View screening result for ${app.candidateName}`}
              >
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
