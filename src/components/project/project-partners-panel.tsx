"use client";

import { useState } from "react";
import { Check, Link2, Mail, MessageCircle, Users, X } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useFetch } from "@/hooks/use-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/page-loader";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { requireEmail } from "@/lib/api/validation";

type UserInfo = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

type Member = {
  id: string;
  user: UserInfo;
};

type PendingRequest = {
  id: string;
  createdAt: string;
  user: UserInfo;
};

type PartnersOverview = {
  members: Member[];
  pendingRequests: PendingRequest[];
  canApprove: boolean;
  canInvite: boolean;
};

export function ProjectPartnersPanel({
  projectId,
  compact = false,
}: {
  projectId: string;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const [inviteLink, setInviteLink] = useState("");
  const [sending, setSending] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const { data, loading, refetch } = useFetch(`project:${projectId}:partners`, () =>
    apiFetch<PartnersOverview>(`/api/v1/projects/${projectId}/partners`)
  );

  async function inviteByEmail() {
    clear();
    setSuccessMessage("");
    const validationMessage = requireEmail(email);
    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    setSending(true);
    try {
      await apiFetch(`/api/v1/projects/${projectId}/partners`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setSuccessMessage("Invite sent. Link expires in 24 hours.");
      setEmail("");
      refetch(true);
    } catch (err) {
      applyError(err, "Failed to send invite");
    } finally {
      setSending(false);
    }
  }

  async function getShareLink() {
    setSending(true);
    clear();
    setSuccessMessage("");
    try {
      const result = await apiFetch<{ url: string }>(`/api/v1/projects/${projectId}/partners`, {
        method: "POST",
        body: JSON.stringify({ action: "link" }),
      });
      setInviteLink(result.url);
      setSuccessMessage("Share this link — it expires in 24 hours.");
    } catch (err) {
      applyError(err, "Failed to create link");
    } finally {
      setSending(false);
    }
  }

  async function reviewRequest(requestId: string, action: "approve" | "reject") {
    setReviewingId(requestId);
    clear();
    setSuccessMessage("");
    try {
      await apiFetch(`/api/v1/projects/${projectId}/partners/requests/${requestId}`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setSuccessMessage(action === "approve" ? "Partner approved." : "Partner request declined.");
      refetch(true);
    } catch (err) {
      applyError(err, "Could not update request");
    } finally {
      setReviewingId(null);
    }
  }

  function shareWhatsApp() {
    if (!inviteLink) return;
    const text = encodeURIComponent(
      `Join my work order on Project Z (link expires in 24h): ${inviteLink}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  if (loading) return <PageLoader label="Loading partners..." />;

  const members = data?.members ?? [];
  const pendingRequests = data?.pendingRequests ?? [];
  const canApprove = data?.canApprove ?? false;
  const canInvite = data?.canInvite ?? false;

  return (
    <div className="space-y-4">
      {canApprove && (
        <Card
          className={
            compact
              ? "rounded-xl border border-l-4 border-l-amber-400 shadow-none"
              : "rounded-2xl border-0 border-l-4 border-l-amber-400 shadow-md"
          }
        >
          <CardHeader className={compact ? "px-0 pt-0 pb-2" : undefined}>
            <CardTitle className="text-lg">Pending Approval</CardTitle>
            <p className="text-sm text-muted-foreground">
              Review partner requests before they get access.
            </p>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {pendingRequests.length === 0 ? (
              <p className="px-6 py-4 text-sm text-muted-foreground">
                No pending requests.
                {canInvite ? " Share an invite link to add partners." : ""}
              </p>
            ) : (
              pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div>
                    <p className="font-medium">{req.user.name}</p>
                    <p className="text-sm text-muted-foreground">{req.user.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-10 rounded-xl"
                      disabled={reviewingId === req.id}
                      onClick={() => reviewRequest(req.id, "approve")}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 rounded-xl"
                      disabled={reviewingId === req.id}
                      onClick={() => reviewRequest(req.id, "reject")}
                    >
                      <X className="mr-1 h-4 w-4" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {canInvite && (
        <Card className={compact ? "rounded-xl border shadow-none" : "rounded-2xl border-0 shadow-md"}>
          {!compact && (
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Invite Partners
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Only you (work order owner) can invite. Links expire in 24 hours.
              </p>
            </CardHeader>
          )}
          <CardContent className={compact ? "space-y-4 p-0 pt-1" : "space-y-4"}>
            <div className="space-y-2">
              <Label>Invite by email</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="partner@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl text-base"
                />
                <Button
                  type="button"
                  className="h-12 shrink-0 rounded-xl px-4"
                  onClick={inviteByEmail}
                  disabled={sending}
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-11 rounded-xl"
                onClick={getShareLink}
                disabled={sending}
              >
                <Link2 className="mr-1 h-4 w-4" />
                Get share link
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-xl text-green-700"
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
      )}

      <Card className={compact ? "rounded-xl border shadow-none" : "rounded-2xl border-0 shadow-md"}>
        <CardHeader className={compact ? "px-0 pt-0 pb-2" : undefined}>
          <CardTitle className="text-lg">Partners on this work order</CardTitle>
          {!canInvite && (
            <p className="text-sm text-muted-foreground">
              View only — only the work order owner can invite new partners.
            </p>
          )}
        </CardHeader>
        <CardContent className="divide-y p-0">
          {members.map((m) => (
            <div key={m.id} className="flex justify-between px-4 py-4 sm:px-6">
              <div>
                <p className="font-medium">{m.user.name}</p>
                <p className="text-sm text-muted-foreground">{m.user.email}</p>
              </div>
            </div>
          ))}
          {!members.length && (
            <p className="p-6 text-sm text-muted-foreground">No partners on this work order yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
