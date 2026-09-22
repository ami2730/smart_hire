"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Briefcase, Users, FileText, Sparkles, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface SearchItem {
  id: string;
  category: "Jobs" | "Candidates" | "Applications";
  title: string;
  description: string;
  href: string;
}

const mockSearchData: SearchItem[] = [
  {
    id: "job-1",
    category: "Jobs",
    title: "Senior Full Stack Engineer",
    description: "Active · 28 applicants · Engineering team",
    href: "/jobs/job-1",
  },
  {
    id: "job-2",
    category: "Jobs",
    title: "Backend Python / ML Engineer",
    description: "Active · 19 applicants · AI/ML team",
    href: "/jobs/job-2",
  },
  {
    id: "job-3",
    category: "Jobs",
    title: "Frontend Architect (React / Next.js)",
    description: "Draft · 0 applicants · Core team",
    href: "/jobs/job-3",
  },
  {
    id: "cand-1",
    category: "Candidates",
    title: "Abebe Kebede",
    description: "Senior Backend Engineer · 89% AI Match",
    href: "/candidates/cand-1",
  },
  {
    id: "cand-2",
    category: "Candidates",
    title: "Sara Tadesse",
    description: "Full Stack Engineer · 94% AI Match",
    href: "/candidates/cand-2",
  },
  {
    id: "cand-3",
    category: "Candidates",
    title: "Michael Chen",
    description: "ML Infrastructure Engineer · 86% AI Match",
    href: "/candidates/cand-3",
  },
  {
    id: "app-1",
    category: "Applications",
    title: "Application #APP-8041",
    description: "Abebe Kebede → Backend Python / ML Engineer",
    href: "/applications/app-1",
  },
  {
    id: "app-2",
    category: "Applications",
    title: "Application #APP-8042",
    description: "Sara Tadesse → Senior Full Stack Engineer",
    href: "/applications/app-2",
  },
];

interface CommandSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandSearchModal({ open, onOpenChange }: CommandSearchModalProps) {
  const [query, setQuery] = React.useState("");
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const filteredItems = React.useMemo(() => {
    if (!query.trim()) return mockSearchData;
    const lower = query.toLowerCase();
    return mockSearchData.filter(
      (item) =>
        item.title.toLowerCase().includes(lower) ||
        item.description.toLowerCase().includes(lower) ||
        item.category.toLowerCase().includes(lower)
    );
  }, [query]);

  const handleSelect = (href: string) => {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  };

  const getCategoryIcon = (category: SearchItem["category"]) => {
    switch (category) {
      case "Jobs":
        return <Briefcase className="h-4 w-4 text-blue-500" />;
      case "Candidates":
        return <Users className="h-4 w-4 text-emerald-500" />;
      case "Applications":
        return <FileText className="h-4 w-4 text-amber-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xl gap-0 overflow-hidden border-border/80 shadow-2xl bg-card">
        <DialogTitle className="sr-only">Quick Search</DialogTitle>
        <div className="flex items-center border-b border-border/60 px-4 py-3 bg-card">
          <Search className="h-4 w-4 text-muted-foreground mr-3 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search jobs, candidates, applications... (Press Esc to exit)"
            className="flex h-6 w-full rounded-md bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            autoFocus
          />
          <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            ESC
          </kbd>
        </div>

        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-border/30">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No matching results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Navigation
              </div>
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.href)}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted group-hover:bg-background/80 transition-colors">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-2 shrink-0">
                    <span className="text-[10px] rounded px-1.5 py-0.5 font-medium bg-muted text-muted-foreground border border-border/50">
                      {item.category}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/50 bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>AI-Assisted Candidate Screening Platform</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Navigation: Click or Enter</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
