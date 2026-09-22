import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  trend = "neutral",
  description,
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("hover:border-border/90 transition-colors shadow-xs", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {value}
        </div>
        {(change || description) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
            {change && (
              <span
                className={cn(
                  "font-medium",
                  trend === "up" && "text-emerald-600 dark:text-emerald-400",
                  trend === "down" && "text-rose-600 dark:text-rose-400",
                  trend === "neutral" && "text-muted-foreground"
                )}
              >
                {change}
              </span>
            )}
            {change && description && <span className="text-muted-foreground/40">·</span>}
            {description && <span className="truncate">{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
