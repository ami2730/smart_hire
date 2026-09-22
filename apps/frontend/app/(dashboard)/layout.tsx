"use client";

import * as React from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { AuthGuard } from "@/lib/auth/auth-guard";
import { X } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsedDesktop, setCollapsedDesktop] = React.useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);

  // Close mobile drawer on route resize or Esc
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        {/* Desktop Fixed Sidebar: pinned to screen, never scrolls with page */}
        <div className="hidden md:flex shrink-0 h-screen sticky top-0 z-30">
          <AppSidebar
            collapsed={collapsedDesktop}
            onToggleCollapse={() => setCollapsedDesktop((prev) => !prev)}
          />
        </div>

        {/* Mobile Drawer (Sheet) */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in-0"
              onClick={() => setMobileDrawerOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer content */}
            <div className="relative z-50 flex flex-col w-72 max-w-[85vw] h-full bg-card shadow-2xl animate-in slide-in-from-left duration-200">
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="absolute right-3 top-4 z-50 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
              <AppSidebar
                collapsed={false}
                onToggleCollapse={() => setMobileDrawerOpen(false)}
                onItemClick={() => setMobileDrawerOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main App Container */}
        <div className="flex flex-1 flex-col min-w-0 h-screen overflow-hidden">
          <AppHeader
            onToggleMobileMenu={() => setMobileDrawerOpen((prev) => !prev)}
            onToggleCollapseDesktop={() => setCollapsedDesktop((prev) => !prev)}
            collapsedDesktop={collapsedDesktop}
          />
          <main className="flex-1 overflow-y-auto min-h-0 focus:outline-none">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
