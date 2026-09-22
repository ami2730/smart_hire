import * as React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function PageContainer({
  title,
  subtitle,
  actions,
  children,
  className,
  ...props
}: PageContainerProps) {
  return (
    <div className={cn("p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6", className)} {...props}>
      {(title || subtitle || actions) && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/40">
          <div className="space-y-1">
            {title && (
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2.5">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
