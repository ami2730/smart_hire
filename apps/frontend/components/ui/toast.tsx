"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Toast Context ────────────────────────────────────────────────────────────

export type ToastVariant = "default" | "success" | "error" | "destructive" | "info";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// ── Toast Item Component ─────────────────────────────────────────────────────

const VARIANT_STYLES: Record<
  ToastVariant,
  { container: string; icon: React.ElementType; iconClass: string }
> = {
  default: {
    container: "border-border bg-card",
    icon: Info,
    iconClass: "text-primary",
  },
  success: {
    container: "border-emerald-500/30 bg-emerald-50/90 dark:bg-emerald-950/90 text-emerald-950 dark:text-emerald-50",
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
  },
  error: {
    container: "border-red-500/30 bg-red-50/90 dark:bg-red-950/90 text-red-950 dark:text-red-50",
    icon: AlertCircle,
    iconClass: "text-red-500",
  },
  destructive: {
    container: "border-red-500/30 bg-red-50/90 dark:bg-red-950/90 text-red-950 dark:text-red-50",
    icon: AlertCircle,
    iconClass: "text-red-500",
  },
  info: {
    container: "border-blue-500/30 bg-blue-50/90 dark:bg-blue-950/90 text-blue-950 dark:text-blue-50",
    icon: Info,
    iconClass: "text-blue-500",
  },
};

function ToastItem({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const variant = item.variant ?? "default";
  const config = VARIANT_STYLES[variant];
  const Icon = config.icon;

  return (
    <ToastPrimitive.Root
      className={cn(
        "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg transition-all",
        "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
        "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0",
        "data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
        config.container
      )}
    >
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.iconClass)} />
      <div className="flex-1 min-w-0">
        <ToastPrimitive.Title className="text-sm font-semibold text-foreground leading-none">
          {item.title}
        </ToastPrimitive.Title>
        {item.description && (
          <ToastPrimitive.Description className="mt-1 text-xs text-muted-foreground">
            {item.description}
          </ToastPrimitive.Description>
        )}
      </div>
      <ToastPrimitive.Close
        onClick={onClose}
        className="shrink-0 rounded-md p-1 text-muted-foreground opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all"
      >
        <X className="h-3.5 w-3.5" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

// ── Toast Provider ───────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((item: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...item, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const remove = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col gap-2 pointer-events-none">
          {toasts.map((t) => (
            <ToastItem key={t.id} item={t} onClose={() => remove(t.id)} />
          ))}
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
