import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";

export function DashboardSkeleton() {
  return (
    <PageContainer>
      {/* Header skeleton */}
      <div className="space-y-2 pb-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-md" />
        <div className="h-4 w-96 bg-muted/60 animate-pulse rounded-md" />
      </div>

      {/* Decision notice skeleton */}
      <div className="h-12 w-full bg-muted/40 animate-pulse rounded-lg border border-border/40" />

      {/* 6 KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-8 w-8 rounded-lg bg-muted" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-7 w-16 bg-muted rounded" />
              <div className="h-3 w-32 bg-muted/60 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts & Recent Activity skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        <Card className="lg:col-span-2 animate-pulse">
          <CardHeader>
            <div className="h-5 w-48 bg-muted rounded" />
            <div className="h-3 w-64 bg-muted/60 rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted/30 rounded-lg" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 animate-pulse">
          <CardHeader>
            <div className="h-5 w-36 bg-muted rounded" />
            <div className="h-3 w-48 bg-muted/60 rounded" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted/30 rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
