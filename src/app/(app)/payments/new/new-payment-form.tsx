"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { firstValidationIssue, parseAmountInput, requireSelect } from "@/lib/api/validation";

type OrgMember = {
  userId: string;
  user: { id: string; name: string | null; email: string };
};

export default function NewPaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedProjectId = searchParams.get("projectId") ?? "";
  const prefillVendorId = searchParams.get("vendorId") ?? "";

  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [form, setForm] = useState({
    projectId: lockedProjectId,
    vendorId: prefillVendorId,
    paidByUserId: "",
    amount: "",
    paymentMethod: "UPI",
    paymentDate: new Date().toISOString().split("T")[0],
    referenceNumber: "",
    paymentType: "VENDOR",
  });
  const [loading, setLoading] = useState(false);
  const { warning, error, clear, showWarning, applyResponseError } = useFormFeedback();

  useEffect(() => {
    if (!lockedProjectId) {
      router.replace("/projects");
    }
  }, [lockedProjectId, router]);

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/v1/auth/me");
      const meData = await meRes.json();
      const orgId = meData.data?.organizationMembers?.[0]?.organizationId as string | undefined;

      const [projectsRes, vendorsRes] = await Promise.all([
        fetch("/api/v1/projects"),
        fetch("/api/v1/vendors"),
      ]);
      const [projectsData, vendorsData] = await Promise.all([
        projectsRes.json(),
        vendorsRes.json(),
      ]);
      setProjects(projectsData.data ?? []);
      setVendors(vendorsData.data ?? []);

      if (orgId) {
        const membersRes = await fetch(`/api/v1/organizations/${orgId}/members`);
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers((membersData.data ?? []).filter((m: OrgMember) => m.user?.id));
        }
      }

      const currentUserId = meData.data?.id as string | undefined;
      if (currentUserId) {
        setForm((f) => ({ ...f, paidByUserId: f.paidByUserId || currentUserId }));
      }
    }
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    clear();

    const amountResult = parseAmountInput(form.amount);
    const validationMessage = firstValidationIssue([
      requireSelect(form.paidByUserId, "who paid"),
      !amountResult.ok ? amountResult.message : null,
      !form.paymentDate ? "Please select a payment date" : null,
    ]);

    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    if (!amountResult.ok) return;

    setLoading(true);
    const res = await fetch("/api/v1/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: amountResult.amount }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      router.push(`/projects/${form.projectId}?tab=payments`);
    } else {
      applyResponseError(data, "Failed to save payment");
    }
  }

  if (!lockedProjectId) return null;

  const projectName = projects.find((p) => p.id === form.projectId)?.name;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Work Order</p>
        <h1 className="text-3xl font-bold">Record Payment</h1>
        {projectName && <p className="text-muted-foreground">{projectName}</p>}
      </div>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-4">
            <FormFeedback warning={warning} error={error} />
            <div className="space-y-2">
              <Label>Vendor</Label>
              <select
                className="flex h-11 w-full rounded-lg border px-4"
                value={form.vendorId}
                onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
              >
                <option value="">Select...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Paid By</Label>
              <select
                className="flex h-11 w-full rounded-lg border px-4"
                value={form.paidByUserId}
                onChange={(e) => setForm({ ...form, paidByUserId: e.target.value })}
                required
              >
                <option value="">Select...</option>
                {members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name ?? m.user.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <select
                className="flex h-11 w-full rounded-lg border px-4"
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              >
                {["CASH", "UPI", "BANK", "CARD", "CHEQUE", "OTHER"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <DatePicker
                value={form.paymentDate}
                onChange={(paymentDate) => setForm({ ...form, paymentDate })}
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              Save Payment
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
