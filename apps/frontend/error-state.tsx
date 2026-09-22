import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this information. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center my-6 max-w-lg mx-auto space-y-3">
      <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-2 mt-2 border-border"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  );
}
