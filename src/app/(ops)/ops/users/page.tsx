"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type OpsUserRow = {
  id: string;
  role: string;
  status: string;
  joinedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    lastLoginAt: string | null;
  };
  organization: {
    id: string;
    name: string;
    subscriptionStatus: string;
  };
};

export default function OpsUsersPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [rows, setRows] = useState<OpsUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debounced) params.set("q", debounced);
      const res = await apiFetch<{ items: OpsUserRow[] }>(
        `/api/v1/ops/users?${params.toString()}`
      );
      setRows(res.items);
    } finally {
      setLoading(false);
    }
  }, [debounced]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Users</h2>
        <p className="text-sm text-muted-foreground">
          Every person on the platform with their organization and role.
        </p>
      </div>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, email, phone, or organization…"
        className="max-w-md rounded-xl"
      />

      {loading ? (
        <PageLoader label="Loading users…" />
      ) : (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Platform users</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No users match that search.
              </p>
            ) : (
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Person</th>
                    <th className="pb-2 pr-4 font-medium">Role</th>
                    <th className="pb-2 pr-4 font-medium">Organization</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Joined</th>
                    <th className="pb-2 font-medium">Last login</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium">{row.user.name}</p>
                        <p className="text-xs text-muted-foreground">{row.user.email}</p>
                      </td>
                      <td className="py-2.5 pr-4">{row.role}</td>
                      <td className="py-2.5 pr-4">
                        <Link
                          href={`/ops/customers/${row.organization.id}`}
                          className="text-primary hover:underline"
                        >
                          {row.organization.name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge variant="secondary" className="rounded-full text-[10px]">
                          {row.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {row.joinedAt
                          ? new Date(row.joinedAt).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {row.user.lastLoginAt
                          ? new Date(row.user.lastLoginAt).toLocaleString("en-IN")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
