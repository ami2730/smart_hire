import * as React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this data. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <Card className={cn("border border-destructive/30 bg-destructive/5", className)}>
      <CardContent className="py-12 px-4 flex flex-col items-center justify-center text-center">
        <div className="h-11 w-11 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-3">
          <AlertCircle className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">{message}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-4 text-xs font-medium gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
