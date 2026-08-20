"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { NotificationListItem } from "@/modules/notifications/domain/types";

type NotificationListResponse = {
  unreadCount: number;
  notifications: NotificationListItem[];
};

export function NotificationInbox() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) {
      setLoading(true);
    }
    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as NotificationListResponse;
      setUnreadCount(data.unreadCount);
      setItems(data.notifications);
    } finally {
      if (!opts?.quiet) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const boot = window.setTimeout(() => {
      void load({ quiet: true });
    }, 0);
    const interval = window.setInterval(() => {
      void load({ quiet: true });
    }, 60_000);
    return () => {
      window.clearTimeout(boot);
      window.clearInterval(interval);
    };
  }, [load]);

  async function markAllRead() {
    const response = await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    if (response.ok) {
      await load();
    }
  }

  async function markOneRead(notificationId: string) {
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });
    await load({ quiet: true });
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
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive" />
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 gap-0 p-0 sm:w-96"
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
          {loading && items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className={cn(
                        "block px-3 py-2.5 transition-colors hover:bg-muted/60",
                        !item.read && "bg-muted/30"
                      )}
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
                      className={cn(
                        "block w-full px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                        !item.read && "bg-muted/30"
                      )}
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
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({ item }: { item: NotificationListItem }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        {!item.read ? (
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{item.body}</p>
    </div>
  );
}
