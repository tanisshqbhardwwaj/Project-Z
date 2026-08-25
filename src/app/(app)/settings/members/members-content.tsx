"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Mail, Link2 } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/page-loader";
import { useFetch } from "@/hooks/use-fetch";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { requireEmail } from "@/lib/api/validation";
import { useBusinessType } from "@/hooks/use-business-type";
import { ORG_ROLE_LABELS } from "@/lib/permissions/rbac";
import type { OrgRole } from "@prisma/client";

const INVITE_ROLES: OrgRole[] = ["PARTNER", "ACCOUNTANT", "VIEWER", "CASHIER"];

export default function MembersContent() {
  const biz = useBusinessType();
  const { activeOrganizationId } = useAuthStore();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("PARTNER");
  const [successMessage, setSuccessMessage] = useState("");
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const [inviteLink, setInviteLink] = useState("");

  const { data: members, loading, refetch } = useFetch(
    activeOrganizationId ? `org:${activeOrganizationId}:members` : null,
    () =>
      apiFetch<
        Array<{
          id: string;
          role: string;
          user: { name: string; email: string };
          partnerProjectCount: number;
          partnerProjects: Array<{ id: string; name: string }>;
        }>
      >(`/api/v1/organizations/${activeOrganizationId}/members`)
  );

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrganizationId) return;
    clear();
    setSuccessMessage("");
    const validationMessage = requireEmail(email);
    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }
    try {
      await apiFetch(`/api/v1/organizations/${activeOrganizationId}/members`, {
        method: "POST",
        body: JSON.stringify({ email, role: inviteRole }),
      });
      setSuccessMessage("Invitation email sent!");
      setEmail("");
      refetch(true);
    } catch (err) {
      applyError(err, "Failed to send invite");
    }
  }

  async function getLink() {
    if (!activeOrganizationId) return;
    clear();
    setSuccessMessage("");
    try {
      const data = await apiFetch<{ url: string }>(
        `/api/v1/organizations/${activeOrganizationId}/members/link`,
        { method: "POST", body: JSON.stringify({ role: inviteRole }) }
      );
      setInviteLink(data.url);
      setSuccessMessage("Share this link with your partner");
    } catch (err) {
      applyError(err, "Failed to create invite link");
    }
  }

  function shareWhatsApp() {
    if (!inviteLink) return;
    const text = encodeURIComponent(`Join my organization on Project Z: ${inviteLink}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  if (loading) return <PageLoader label="Loading members..." />;

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-8">
      <h1 className="text-2xl font-bold">Organization Team</h1>
      <p className="text-sm text-muted-foreground">{biz.teamHint}</p>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Invite Org Team Member</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={invite} className="space-y-3">
            <div className="space-y-2">
              <Label>Role</Label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                className="h-12 w-full rounded-xl border bg-background px-3"
              >
                {INVITE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ORG_ROLE_LABELS[r]}
                    {r === "CASHIER" ? " — counter sales only" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@email.com"
                className="h-12 rounded-xl"
                required
              />
              <Button type="submit" className="h-12 shrink-0 rounded-xl px-4">
                <Mail className="h-4 w-4" />
              </Button>
            </div>
            </div>
          </form>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" onClick={getLink}>
              <Link2 className="mr-1 h-4 w-4" />
              Get link
            </Button>
            <Button
              variant="outline"
              className="rounded-xl text-green-700"
              onClick={shareWhatsApp}
              disabled={!inviteLink}
            >
              <MessageCircle className="mr-1 h-4 w-4" />
              WhatsApp
            </Button>
          </div>
          {inviteLink && (
            <p className="break-all rounded-lg bg-muted/60 p-3 text-xs">{inviteLink}</p>
          )}
          <FormFeedback warning={warning} error={error} />
          {successMessage && <p className="text-sm text-green-700">{successMessage}</p>}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardContent className="divide-y pt-4">
          {(members ?? []).map((m) => (
            <div key={m.id} className="flex justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="font-medium">{m.user.name}</p>
                <p className="text-sm text-muted-foreground">{m.user.email}</p>
                <p className="mt-1 text-xs text-muted-foreground capitalize">
                  Role: {m.role.toLowerCase()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {m.partnerProjectCount === 0
                    ? `Not a ${biz.partnerLabel.toLowerCase()} on any ${biz.workItemSingularLower}`
                    : m.partnerProjectCount === 1
                      ? `${biz.partnerLabel} on 1 ${biz.workItemSingularLower}: ${m.partnerProjects[0]?.name ?? "—"}`
                      : `${biz.partnerLabel} on ${m.partnerProjectCount} ${biz.workItemPlural.toLowerCase()}: ${m.partnerProjects
                          .map((p) => p.name)
                          .join(", ")}`}
                </p>
              </div>
              <span className="h-fit shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {m.role}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
