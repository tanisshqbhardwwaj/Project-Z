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
      setSuccessMessage("Partner invite sent. They can request access after opening the link.");
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
      setSuccessMessage("Share this link. Partners must be approved by the work order owner.");
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
    const text = encodeURIComponent(`Join my work order on Project Z: ${inviteLink}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  if (loading) return <PageLoader label="Loading partners..." />;

  const members = data?.members ?? [];
  const pendingRequests = data?.pendingRequests ?? [];
  const canApprove = data?.canApprove ?? false;

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
              Review partner requests before they get access to this work order.
            </p>
          </CardHeader>
          <CardContent className={compact ? "divide-y p-0" : "divide-y p-0"}>
            {pendingRequests.length === 0 ? (
              <p className="px-6 py-4 text-sm text-muted-foreground">
                No pending requests. Share an invite link — partners will appear here after they
                request to join.
              </p>
            ) : (
              pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{req.user.name}</p>
                    <p className="text-sm text-muted-foreground">{req.user.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="rounded-xl"
                      disabled={reviewingId === req.id}
                      onClick={() => reviewRequest(req.id, "approve")}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
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

      <Card className={compact ? "rounded-xl border shadow-none" : "rounded-2xl border-0 shadow-md"}>
        {!compact && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Work Order Partners
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Partners added here can access only this work order. You must approve each partner
              before they get access.
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
                className="h-12 rounded-xl"
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
            <Button variant="outline" className="rounded-xl" onClick={getShareLink} disabled={sending}>
              <Link2 className="mr-1 h-4 w-4" />
              Get share link
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

      <Card className={compact ? "rounded-xl border shadow-none" : "rounded-2xl border-0 shadow-md"}>
        <CardHeader className={compact ? "px-0 pt-0 pb-2" : undefined}>
          <CardTitle className="text-lg">Current Partners</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {members.map((m) => (
            <div key={m.id} className="flex justify-between px-6 py-4">
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
