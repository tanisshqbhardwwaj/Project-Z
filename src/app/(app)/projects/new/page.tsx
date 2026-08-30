"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    contractAmount: "",
    clientName: "",
    workOrderNumber: "",
    workOrderDate: new Date().toISOString().split("T")[0],
    location: "",
  });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/v1/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        contractAmount: parseFloat(form.contractAmount),
        location: form.location,
        workOrder: {
          workOrderNumber: form.workOrderNumber || `WO-${Date.now()}`,
          workOrderDate: form.workOrderDate,
          clientName: form.clientName,
        },
      }),
    });
    setLoading(false);
    const data = await res.json();
    if (res.ok) router.push(`/projects/${data.data.id}`);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-3xl font-bold">New Project</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Contract Amount (₹)</Label>
              <Input type="number" value={form.contractAmount} onChange={(e) => setForm({ ...form, contractAmount: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Work Order Number</Label>
              <Input value={form.workOrderNumber} onChange={(e) => setForm({ ...form, workOrderNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Work Order Date</Label>
              <DatePicker value={form.workOrderDate} onChange={(workOrderDate) => setForm({ ...form, workOrderDate })} />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>Create Project</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
