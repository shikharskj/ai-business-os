"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { StatusBadge } from "@/components/business/status-badge";
import type { BadgeTone } from "@/components/business/status-badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";
import type {
  NotificationListItem,
  NotificationType,
} from "@/modules/notifications/domain/types";

type NotificationListResponse = {
  unreadCount: number;
  notifications: NotificationListItem[];
};

const TYPE_META: Record<
  NotificationType,
  { label: string; tone: BadgeTone; accent: string }
> = {
  INVOICE_OVERDUE: {
    label: "Overdue",
    tone: "danger",
    accent:
      "border-l-[var(--state-error)] bg-[var(--state-error-subtle)]/50",
  },
  LOW_STOCK: {
    label: "Low stock",
    tone: "warning",
    accent:
      "border-l-[var(--state-warning)] bg-[var(--state-warning-subtle)]/50",
  },
  PAYMENT_RECEIVED: {
    label: "Payment",
    tone: "success",
    accent:
      "border-l-[var(--state-success)] bg-[var(--state-success-subtle)]/40",
  },
  INVOICE_POSTED: {
    label: "Invoice",
    tone: "neutral",
    accent: "border-l-border bg-muted/20",
  },
  INVOICE_CREATED: {
    label: "Invoice",
    tone: "neutral",
    accent: "border-l-border bg-muted/20",
  },
};

function unreadBadgeLabel(count: number): string {
  return count > 9 ? "9+" : String(count);
}

export function NotificationInbox() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) {
      setLoading(true);
    }
    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
      });
      const contentType = response.headers.get("content-type") ?? "";
      const isJson = contentType.includes("application/json");
      if (!response.ok || !isJson) {
        if (open) {
          setError("Failed to load notifications");
        }
        return;
      }
      const data = (await response.json()) as NotificationListResponse;
      setUnreadCount(data.unreadCount);
      setItems(data.notifications);
      setError(null);
    } catch (err) {
      if (open) {
        setError("Failed to load notifications");
      }
      console.error("Notification load failed:", err);
    } finally {
      if (!opts?.quiet) {
        setLoading(false);
      }
    }
  }, [open]);

  useEffect(() => {
    const boot = window.setTimeout(() => {
      void load({ quiet: true });
    }, 0);
    const interval = window.setInterval(() => {
      void load({ quiet: true });
    }, 60_000);

    function onVisibilityOrFocus() {
      if (document.visibilityState === "visible") {
        void load({ quiet: true });
      }
    }

    window.addEventListener("focus", onVisibilityOrFocus);
    document.addEventListener("visibilitychange", onVisibilityOrFocus);

    return () => {
      window.clearTimeout(boot);
      window.clearInterval(interval);
      window.removeEventListener("focus", onVisibilityOrFocus);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
    };
  }, [load]);

  async function markAllRead() {
    const previousItems = items;
    const previousUnread = unreadCount;
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);

    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (!response.ok) {
        setItems(previousItems);
        setUnreadCount(previousUnread);
        if (open) {
          setError("Failed to mark notifications as read");
        }
        await load({ quiet: true });
      }
    } catch (err) {
      setItems(previousItems);
      setUnreadCount(previousUnread);
      if (open) {
        setError("Failed to mark notifications as read");
      }
      console.error("Mark all read failed:", err);
      await load({ quiet: true });
    }
  }

  async function markOneRead(notificationId: string) {
    const target = items.find((item) => item.id === notificationId);
    if (!target || target.read) return;

    setItems((prev) =>
      prev.map((item) =>
        item.id === notificationId ? { ...item, read: true } : item
      )
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (!response.ok) {
        await load({ quiet: true });
      }
    } catch (err) {
      console.error("Mark one read failed:", err);
      await load({ quiet: true });
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          void load();
        }
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          />
        }
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-medium tabular-nums text-white">
            {unreadBadgeLabel(unreadCount)}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(20rem,calc(100vw-1.5rem))] gap-0 p-0 sm:w-96"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-medium text-foreground">Notifications</p>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => void markAllRead()}
            >
              Mark all read
            </Button>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {error ? (
            <p className="px-3 py-6 text-center text-sm text-destructive">
              {error}
            </p>
          ) : loading && items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <div className="flex flex-col gap-1 px-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No notifications yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Payments, overdue invoices, and low stock will show up here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => {
                const meta = TYPE_META[item.type];
                const rowClass = cn(
                  "block w-full border-l-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                  !item.read ? meta.accent : "border-l-transparent"
                );

                return (
                  <li key={item.id}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className={rowClass}
                        onClick={() => {
                          if (!item.read) {
                            void markOneRead(item.id);
                          }
                          setOpen(false);
                        }}
                      >
                        <NotificationRow item={item} />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={rowClass}
                        onClick={() => {
                          if (!item.read) {
                            void markOneRead(item.id);
                          }
                        }}
                      >
                        <NotificationRow item={item} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({ item }: { item: NotificationListItem }) {
  const meta = TYPE_META[item.type];
  const relative = formatRelativeTime(item.createdAt);

  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <p className="text-sm font-medium text-foreground">{item.title}</p>
          <StatusBadge size="sm" tone={meta.tone}>
            {meta.label}
          </StatusBadge>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {relative ? (
            <time
              className="text-xs text-muted-foreground"
              dateTime={item.createdAt}
              title={item.createdAt}
            >
              {relative}
            </time>
          ) : null}
          {!item.read ? (
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          ) : null}
        </div>
      </div>
      <p className="line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
    </div>
  );
}
