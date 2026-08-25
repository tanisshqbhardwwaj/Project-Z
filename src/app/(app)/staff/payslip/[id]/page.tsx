"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query/keys";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { paiseToRupees } from "@/lib/finance/money";

export default function PayslipPage() {
  const { id } = useParams<{ id: string }>();
  const orgId = useAuthStore((s) => s.activeOrganizationId);
  const orgName = useAuthStore((s) => s.activeOrganizationName);

  const { data, isLoading } = useQuery({
    queryKey: orgId ? [...queryKeys.staff.all(orgId), "payslip", id] : ["disabled"],
    queryFn: () =>
      apiFetch<{
        id: string;
        year: number;
        month: number;
        presentDays: number;
        halfDays: number;
        absentDays: number;
        workingDays: number;
        finalAmountPaise: string;
        staff: { name: string; roleTitle: string };
      }>(`/api/v1/staff/payroll/${id}`),
    enabled: !!orgId && !!id,
  });

  if (isLoading) return <PageLoader label="Loading payslip..." />;
  if (!data) return <p className="p-8 text-center">Payslip not found</p>;

  return (
    <div className="mx-auto max-w-lg space-y-6 p-4 print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/staff">
          <Button variant="outline" className="rounded-xl">
            Back
          </Button>
        </Link>
        <Button className="rounded-xl" onClick={() => window.print()}>
          Print
        </Button>
      </div>
      <article className="rounded-2xl border bg-card p-6 shadow-md">
        <h1 className="text-xl font-bold">Payslip</h1>
        <p className="text-sm text-muted-foreground">{orgName}</p>
        <p className="mt-4 font-medium">{data.staff.name}</p>
        <p className="text-sm text-muted-foreground">{data.staff.roleTitle}</p>
        <p className="mt-2 text-sm">
          Period: {data.month}/{data.year}
        </p>
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>Present</dt>
            <dd>{data.presentDays}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Half days</dt>
            <dd>{data.halfDays}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Absent</dt>
            <dd>{data.absentDays}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Days in month</dt>
            <dd>{data.workingDays}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <dt>Net pay</dt>
            <dd>₹{paiseToRupees(BigInt(data.finalAmountPaise))}</dd>
          </div>
        </dl>
      </article>
    </div>
  );
}
