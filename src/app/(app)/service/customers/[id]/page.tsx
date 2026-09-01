"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, History } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { formatINR } from "@/lib/finance/money";
import { formatCustomerLabel } from "@/lib/shop/customers/customer";
import { useState } from "react";

type CustomerProfile = {
  id: string;
  name: string;
  phone: string | null;
};

type AppointmentHistory = {
  id: string;
  startAt: string;
  status: string;
  staffName: string | null;
  itemsSummary?: string;
  totalPaise?: string;
  saleId: string | null;
};

type FollowUpRow = {
  id: string;
  dueDate: string;
  note: string | null;
  status: string;
};

export default function ServiceCustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const appointmentsEnabled = isModuleEnabled(enabledModules, "service_appointments");
  const qc = useQueryClient();
  const { error, clear, applyError } = useFormFeedback();
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [followUpNote, setFollowUpNote] = useState("");

  const customerQuery = useQuery({
    queryKey: orgId && id ? queryKeys.modules.shop.customers(orgId) : ["disabled"],
    queryFn: async () => {
      const rows = await apiFetch<CustomerProfile[]>("/api/v1/shop/customers?all=1&limit=500");
      const list = Array.isArray(rows) ? rows : [];
      return list.find((c) => c.id === id) ?? { id: id!, name: "Customer", phone: null };
    },
    enabled: !!orgId && !!id,
  });

  const historyQuery = useQuery({
    queryKey: orgId && id ? queryKeys.modules.service.customer(orgId, id) : ["disabled"],
    queryFn: () =>
      apiFetch<{ appointments: AppointmentHistory[] }>(
        `/api/v1/service/appointments?customerId=${id}&limit=50`
      ).then((r) => (Array.isArray(r) ? r : r.appointments ?? [])),
    enabled: !!orgId && !!id && appointmentsEnabled,
  });

  const followUpsQuery = useQuery({
    queryKey: orgId && id ? [...queryKeys.modules.service.customer(orgId, id), "followups"] : ["disabled"],
    queryFn: () =>
      apiFetch<{ followUps: FollowUpRow[] }>(`/api/v1/service/followups?customerId=${id}`).then(
        (r) => (Array.isArray(r) ? r : r.followUps ?? [])
      ),
    enabled: !!orgId && !!id && appointmentsEnabled,
  });

  const createFollowUp = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/service/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: id,
          dueDate: followUpDate,
          note: followUpNote.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({
          queryKey: [...queryKeys.modules.service.customer(orgId, id!), "followups"],
        });
      }
      setFollowUpOpen(false);
      setFollowUpNote("");
    },
    onError: (e) => applyError(e),
  });

  const patchFollowUp = useMutation({
    mutationFn: ({ followUpId, status }: { followUpId: string; status: string }) =>
      apiFetch(`/api/v1/service/followups/${followUpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      if (orgId) {
        qc.invalidateQueries({
          queryKey: [...queryKeys.modules.service.customer(orgId, id!), "followups"],
        });
      }
    },
  });

  if (customerQuery.isLoading) return <PageLoader label="Loading customer..." />;

  const customer = customerQuery.data!;
  const history = historyQuery.data ?? [];
  const followUps = followUpsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/shop/customers"
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to customers
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {formatCustomerLabel({ name: customer.name, phone: customer.phone })}
            </h1>
            <p className="text-sm text-muted-foreground">Service history & follow-ups</p>
          </div>
          {appointmentsEnabled ? (
            <Link href={`/service/appointments/new?customerId=${id}`}>
              <Button className="rounded-xl">
                <CalendarDays className="mr-2 h-4 w-4" />
                New booking
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <FormFeedback error={error} />

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Service history
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historyQuery.isLoading ? (
            <PageLoader label="Loading history..." />
          ) : history.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No service appointments yet.</p>
          ) : (
            <div className="divide-y">
              {history.map((appt) => (
                <Link
                  key={appt.id}
                  href={`/service/appointments/${appt.id}`}
                  className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium">
                      {new Date(appt.startAt).toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {appt.itemsSummary ?? "Services"}
                      {appt.staffName ? ` · ${appt.staffName}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">{appt.status.replace(/_/g, " ")}</Badge>
                    {appt.totalPaise ? (
                      <p className="mt-1 text-sm font-medium tabular-nums">
                        {formatINR(appt.totalPaise)}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Follow-ups</CardTitle>
          <Button size="sm" className="rounded-xl" onClick={() => setFollowUpOpen(true)}>
            Add follow-up
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {followUps.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No follow-ups scheduled.</p>
          ) : (
            <div className="divide-y">
              {followUps.map((fu) => (
                <div key={fu.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="font-medium">
                      {new Date(fu.dueDate).toLocaleDateString("en-IN")}
                    </p>
                    {fu.note ? <p className="text-xs text-muted-foreground">{fu.note}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{fu.status}</Badge>
                    {fu.status === "PENDING" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => patchFollowUp.mutate({ followUpId: fu.id, status: "DONE" })}
                      >
                        Done
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Schedule follow-up</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Due date</Label>
              <DatePicker value={followUpDate} onChange={setFollowUpDate} />
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Input
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                className="rounded-xl"
                placeholder="Call back, renewal reminder…"
              />
            </div>
            <Button
              className="rounded-xl"
              disabled={createFollowUp.isPending}
              onClick={() => {
                clear();
                createFollowUp.mutate();
              }}
            >
              Save follow-up
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
