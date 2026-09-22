import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("border border-dashed border-border/70 bg-card/50", className)}>
      <CardContent className="py-16 px-4 flex flex-col items-center justify-center text-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">{description}</p>
        {actionLabel && onAction && (
          <Button size="sm" onClick={onAction} className="mt-4 text-xs font-medium">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
