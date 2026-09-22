"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Sparkles, Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground gap-4">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 text-primary animate-spin" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold text-foreground">SmartHire Recruiter Portal</p>
          <p className="text-xs text-muted-foreground">Authenticating session security...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
