"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { ScoreDistributionItem } from "@/lib/api/reports.api";

interface ScoreDistributionChartProps {
  data: ScoreDistributionItem[];
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const item: ScoreDistributionItem = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-popover p-2.5 text-xs text-popover-foreground shadow-md">
        <p className="font-semibold text-foreground">Score Bracket: {item.range}</p>
        <p className="text-muted-foreground mt-0.5">
          Candidates: <strong className="text-foreground">{item.count}</strong>
        </p>
      </div>
    );
  }
  return null;
}

export function ScoreDistributionChart({ data }: ScoreDistributionChartProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-72 w-full bg-muted/20 animate-pulse rounded-lg" />;
  }

  return (
    <div className="h-72 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
            opacity={0.5}
          />
          <XAxis
            dataKey="range"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
