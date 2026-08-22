"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Barcode,
  Bell,
  CalendarClock,
  CheckCheck,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SHOP_ALERT } from "@/lib/shop/shop-alerts";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  metadata?: { href?: string } | null;
};

function notificationIcon(type: string) {
  switch (type) {
    case SHOP_ALERT.LOW_STOCK:
      return AlertTriangle;
    case SHOP_ALERT.EXPIRING:
      return CalendarClock;
    case SHOP_ALERT.NO_BARCODE:
      return Barcode;
    default:
      return Bell;
  }
}

function notificationAccent(type: string) {
  switch (type) {
    case SHOP_ALERT.LOW_STOCK:
      return "text-destructive";
    case SHOP_ALERT.EXPIRING:
      return "text-amber-700";
    case SHOP_ALERT.NO_BARCODE:
      return "text-primary";
    default:
      return "text-muted-foreground";
  }
}

export default function NotificationsPage() {
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const qc = useQueryClient();

  const { data: notifications, isLoading, error } = useQuery({
    queryKey: orgId ? queryKeys.notifications(orgId) : ["disabled"],
    queryFn: () => apiFetch<NotificationRow[]>("/api/v1/notifications"),
    enabled: !!orgId,
  });

  async function markRead(id: string) {
    await apiFetch("/api/v1/notifications", {
      method: "PATCH",
      body: JSON.stringify({ id }),
    });
    if (orgId) {
      qc.invalidateQueries({ queryKey: queryKeys.notifications(orgId) });
      qc.invalidateQueries({ queryKey: queryKeys.notificationsUnread(orgId) });
    }
  }

  async function markAllRead() {
    const unread = (notifications ?? []).filter((n) => !n.readAt);
    await Promise.all(unread.map((n) => markRead(n.id)));
  }

  if (isLoading) return <PageLoader label="Loading notifications..." />;
  if (error) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : "Failed to load notifications"}
      </p>
    );
  }

  const list = notifications ?? [];
  const unreadCount = list.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Stock alerts, expiry reminders, and shop updates
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button variant="outline" className="rounded-xl" onClick={() => void markAllRead()}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        ) : null}
      </div>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardContent className="divide-y p-0">
          {list.map((n) => {
            const Icon = notificationIcon(n.type);
            const href =
              typeof n.metadata?.href === "string" ? n.metadata.href : undefined;
            const unread = !n.readAt;

            const content = (
              <div
                className={cn(
                  "flex gap-3 p-4 transition-colors",
                  unread && "bg-accent/30",
                  href && "hover:bg-muted/40"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted",
                    notificationAccent(n.type)
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium leading-tight">{n.title}</p>
                    {unread ? (
                      <Badge className="rounded-full bg-primary/10 text-[10px] text-primary hover:bg-primary/10">
                        New
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                    {n.body}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            );

            if (href) {
              return (
                <Link
                  key={n.id}
                  href={href}
                  onClick={() => {
                    if (unread) void markRead(n.id);
                  }}
                >
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={n.id}
                type="button"
                className="block w-full text-left"
                onClick={() => {
                  if (unread) void markRead(n.id);
                }}
              >
                {content}
              </button>
            );
          })}
          {list.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium">No notifications yet</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Low stock, expiring items, and missing barcodes will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
