"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, FileText } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { useAuthStore } from "@/stores/auth-store";
import { isModuleEnabled } from "@/hooks/use-enabled-modules";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/finance/money";
import { formatCustomerLabel } from "@/lib/shop/customers/customer";

type ContractDetail = {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  startDate: string;
  endDate: string;
  billingCycle: string;
  amountPaise: string;
  visitsIncluded: number | null;
  nextServiceDate: string | null;
  reminderDaysBefore: number;
  status: string;
};

type ContractVisit = {
  id: string;
  dueDate: string;
  status: string;
  appointmentId: string | null;
};

export default function ServiceContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const { enabledModules } = useAuthStore();
  const enabled = isModuleEnabled(enabledModules, "service_contracts");

  const { data, isLoading, error } = useQuery({
    queryKey: orgId && id ? queryKeys.modules.service.contract(orgId, id) : ["disabled"],
    queryFn: () => apiFetch<ContractDetail>(`/api/v1/service/contracts/${id}`),
    enabled: !!orgId && !!id && enabled,
  });

  const visitsQuery = useQuery({
    queryKey: orgId && id ? [...queryKeys.modules.service.contract(orgId, id), "visits"] : ["disabled"],
    queryFn: () =>
      apiFetch<{ visits: ContractVisit[] }>(`/api/v1/service/contracts/${id}/visits`).then((r) =>
        Array.isArray(r) ? r : r.visits ?? []
      ),
    enabled: !!orgId && !!id && enabled,
  });

  if (!enabled) {
    return (
      <p className="text-muted-foreground">
        Turn on AMC Contracts in Manage Organization → Features.
      </p>
    );
  }

  if (isLoading) return <PageLoader label="Loading contract..." />;
  if (error || !data) {
    return (
      <p className="text-destructive">
        {error instanceof Error ? error.message : "Contract not found"}
      </p>
    );
  }

  const visits = visitsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/service/contracts"
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to contracts
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{data.name}</h1>
            <p className="text-sm text-muted-foreground">
              {formatCustomerLabel({ name: data.customerName, phone: data.customerPhone })}
            </p>
          </div>
          <Badge variant="secondary">{data.status}</Badge>
        </div>
      </div>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contract terms
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Period: </span>
            {new Date(data.startDate).toLocaleDateString("en-IN")} –{" "}
            {new Date(data.endDate).toLocaleDateString("en-IN")}
          </p>
          <p>
            <span className="text-muted-foreground">Billing: </span>
            {data.billingCycle.replace(/_/g, " ")}
          </p>
          <p>
            <span className="text-muted-foreground">Amount: </span>
            {formatINR(data.amountPaise)}
          </p>
          {data.visitsIncluded ? (
            <p>
              <span className="text-muted-foreground">Visits included: </span>
              {data.visitsIncluded}
            </p>
          ) : null}
          {data.nextServiceDate ? (
            <p>
              <span className="text-muted-foreground">Next service: </span>
              {new Date(data.nextServiceDate).toLocaleDateString("en-IN")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheduled visits
          </CardTitle>
          <Link href={`/service/appointments/new?contractId=${data.id}&customerId=${data.customerId}`}>
            <Button size="sm" className="rounded-xl">
              Book visit
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {visitsQuery.isLoading ? (
            <PageLoader label="Loading visits..." />
          ) : visits.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No visits scheduled yet.</p>
          ) : (
            <div className="divide-y">
              {visits.map((visit) => (
                <div key={visit.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="font-medium">
                      {new Date(visit.dueDate).toLocaleDateString("en-IN")}
                    </p>
                    <p className="text-xs text-muted-foreground">{visit.status}</p>
                  </div>
                  {visit.appointmentId ? (
                    <Link href={`/service/appointments/${visit.appointmentId}`}>
                      <Button variant="outline" size="sm" className="rounded-xl">
                        Open booking
                      </Button>
                    </Link>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
