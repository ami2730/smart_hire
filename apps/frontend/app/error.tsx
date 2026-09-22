"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Root application error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground text-center">
      <div className="h-16 w-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4 shadow-sm">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Application Error</h1>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {error?.message || "An unexpected error occurred. Please try reloading the application."}
      </p>
      <Button onClick={() => reset()} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Reload Application
      </Button>
    </div>
  );
}
