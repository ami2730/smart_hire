"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Menu,
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  Sparkles,
  PanelLeft,
} from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { CommandSearchModal } from "@/components/layout/command-search-modal";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notificationsApi, type AppNotification } from "@/lib/api/notifications.api";
import { cn } from "@/lib/utils";

function formatTimeAgo(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

interface AppHeaderProps {
  onToggleMobileMenu: () => void;
  onToggleCollapseDesktop?: () => void;
  collapsedDesktop?: boolean;
}

export function AppHeader({
  onToggleMobileMenu,
  onToggleCollapseDesktop,
  collapsedDesktop,
}: AppHeaderProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
    refetchInterval: 30000,
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read) {
      await notificationsApi.markRead(notif.id);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const userInitials = React.useMemo(() => {
    if (!user?.name) return "SK";
    return user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  }, [user]);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border/80 bg-background/95 backdrop-blur-md px-4 sm:px-6">
        {/* Left Section: Mobile menu button, Desktop sidebar toggle, and Breadcrumb */}
        <div className="flex items-center gap-3">
          {/* Mobile Drawer Trigger */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMobileMenu}
            className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label="Open mobile navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop collapse toggle icon in header */}
          {onToggleCollapseDesktop && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapseDesktop}
              className="hidden md:flex h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label={collapsedDesktop ? "Expand sidebar" : "Collapse sidebar"}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}

          <div className="h-4 w-px bg-border/60 hidden md:block" />

          {/* Breadcrumbs */}
          <Breadcrumb />
        </div>

        {/* Right Section: Search, Notifications, Theme switcher, User menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search Button / Command trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="h-9 px-3 w-40 sm:w-60 justify-between text-xs text-muted-foreground bg-card/60 hover:bg-card border-border/70 shadow-none font-normal"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>Search everything...</span>
            </span>
            <kbd className="hidden sm:inline-flex h-4 select-none items-center gap-1 rounded bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground border border-border/50">
              ⌘K
            </kbd>
          </Button>

          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white ring-2 ring-background pointer-events-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/50 px-2 font-semibold">
                <span className="text-sm">Notifications {unreadCount > 0 && `(${unreadCount})`}</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-primary cursor-pointer hover:underline bg-transparent border-0 p-0"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="py-2 space-y-1 max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground text-xs">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "p-2 rounded-md hover:bg-accent cursor-pointer transition-colors space-y-1",
                        !n.read && "bg-primary/[0.04] border-l-2 border-primary"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground truncate max-w-[190px]">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatTimeAgo(n.timestamp)}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Switcher */}
          <ThemeSwitcher />

          {/* User Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 rounded-full pl-1 pr-2 gap-2 hover:bg-accent transition-colors"
                aria-label="User account menu"
              >
                <Avatar className="h-7 w-7 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline-block text-xs font-medium text-foreground max-w-[120px] truncate">
                  {user?.name || "Recruiter"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user?.name || "Amanuel Kebede"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user?.email || "recruiter@smarthire.internal"}
                  </p>
                  <div className="pt-1 flex items-center gap-1 text-[10px] text-primary font-medium">
                    <Sparkles className="h-3 w-3" />
                    <span>{user?.role || "RECRUITER"} · Talent Acquisition</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                className="cursor-pointer py-2"
              >
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                className="cursor-pointer py-2"
              >
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout()}
                className="cursor-pointer py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="mr-2 h-4 w-4 text-destructive" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global Cmd+K Search Palette */}
      <CommandSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
