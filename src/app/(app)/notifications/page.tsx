"use client";

import { apiFetch } from "@/lib/api/client";
import { useFetch } from "@/hooks/use-fetch";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const { user } = useAuthStore();

  const { data: notifications, loading, error } = useFetch(
    user ? `notifications:${user.id}` : null,
    () =>
      apiFetch<
        Array<{
          id: string;
          title: string;
          body: string;
          readAt: string | null;
          createdAt: string;
        }>
      >("/api/v1/notifications")
  );

  if (loading) return <PageLoader label="Loading notifications..." />;
  if (error) return <p className="text-destructive">{error}</p>;

  const list = notifications ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold sm:text-3xl">Notifications</h1>
      <Card className="rounded-2xl border-0 shadow-md">
        <CardContent className="divide-y p-0">
          {list.map((n) => (
            <div key={n.id} className={`p-4 ${!n.readAt ? "bg-accent/30" : ""}`}>
              <p className="font-medium">{n.title}</p>
              <p className="text-sm text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(n.createdAt).toLocaleString("en-IN")}
              </p>
            </div>
          ))}
          {list.length === 0 && (
            <p className="p-8 text-center text-muted-foreground">No notifications.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
