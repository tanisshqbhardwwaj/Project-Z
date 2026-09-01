"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/brand/app-logo";
import { AppearanceMenu } from "@/components/theme/appearance-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { humanizeErrorMessage } from "@/lib/api/validation";
import { setActiveOrganizationId } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";

type InviteInfo = {
  email: string | null;
  organizationName: string;
  organizationId: string;
  role: string;
  purpose: "staff_login" | "org_team";
  isShop: boolean;
  alreadyMember?: boolean;
};

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const { warning, error, clear, applyResponseError, showError } = useFormFeedback();
  const [loading, setLoading] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [done, setDone] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  const invitePath = `/invite/${token}`;
  const sessionEmail = session?.user?.email?.toLowerCase() ?? null;
  const invitedEmail = info?.email?.toLowerCase() ?? null;
  const emailMismatch =
    Boolean(sessionEmail && invitedEmail && sessionEmail !== invitedEmail);
  const loginHref = `/login?callbackUrl=${encodeURIComponent(invitePath)}${
    invitedEmail ? `&email=${encodeURIComponent(invitedEmail)}` : ""
  }`;
  const registerHref = `/register?invite=${encodeURIComponent(token)}${
    invitedEmail ? `&email=${encodeURIComponent(invitedEmail)}` : ""
  }`;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/invite/${token}/accept`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.data) {
          setInfo(d.data as InviteInfo);
          setOrgName(d.data.organizationName ?? "");
          setLoadState("ready");
        } else {
          showError(
            humanizeErrorMessage(d.error?.message ?? "Invalid invitation", d.error?.details)
          );
          setLoadState("error");
        }
      })
      .catch(() => {
        if (cancelled) return;
        showError("Could not load invitation");
        setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
    // Load once per token; showError is not stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function goToWorkspace(organizationId: string, landingPath: string) {
    setActiveOrganizationId(organizationId);
    try {
      await fetch("/api/v1/organizations/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      await update({ activeOrganizationId: organizationId });
    } catch {
      /* cookie from accept is enough; bootstrap will pick localStorage */
    }
    await useAuthStore.getState().bootstrap();
    router.push(landingPath);
    router.refresh();
  }

  async function accept() {
    setLoading(true);
    clear();
    const res = await fetch(`/api/v1/invite/${token}/accept`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      const organization = data.data?.organization;
      setDone(true);
      setOrgName(organization?.name ?? info?.organizationName ?? "the organization");
      const landingPath =
        typeof data.data?.landingPath === "string" ? data.data.landingPath : "/dashboard";
      const organizationId =
        organization?.id ?? info?.organizationId ?? data.data?.member?.organizationId;
      if (organizationId) {
        await goToWorkspace(organizationId, landingPath);
        return;
      }
      setTimeout(() => router.push(landingPath), 800);
    } else if (res.status === 401) {
      applyResponseError(data, "Please log in to accept this invitation");
    } else {
      applyResponseError(data, "Could not accept invitation");
    }
  }

  async function switchAccount() {
    setSwitchingAccount(true);
    useAuthStore.getState().logout();
    await signOut({ callbackUrl: loginHref });
  }

  const isStaffInvite = info?.purpose === "staff_login" || info?.isShop;
  const signedIn = status === "authenticated";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <AppearanceMenu />
      </div>
      <div className="mb-8 w-full max-w-md">
        <AppLogo href="/login" variant="full" brandMode="dual" className="mx-auto w-full" />
      </div>
      <Card className="w-full max-w-md rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle>{isStaffInvite ? "Staff invitation" : "Organization invitation"}</CardTitle>
          <CardDescription>
            {isStaffInvite
              ? "Join this shop as staff. You will only see what the owner enables on your profile."
              : "You've been invited to join a project organization on BusinessOS."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {info ? (
            <div className="rounded-xl bg-muted/60 p-4 text-sm">
              <p className="font-medium">{info.organizationName}</p>
              {info.email ? (
                <p className="mt-1 text-muted-foreground">Invited email: {info.email}</p>
              ) : null}
            </div>
          ) : null}
          <FormFeedback warning={warning} error={error} />
          {loadState === "loading" || status === "loading" ? (
            <p className="text-sm text-muted-foreground">Loading invitation…</p>
          ) : done ? (
            <p className="text-sm text-green-700">
              Welcome! You joined {orgName}. Opening workspace…
            </p>
          ) : info?.alreadyMember && signedIn && !emailMismatch ? (
            <Button
              className="h-12 w-full rounded-xl"
              size="lg"
              onClick={() => goToWorkspace(info.organizationId, "/dashboard")}
            >
              Open workspace
            </Button>
          ) : emailMismatch ? (
            <>
              <p className="text-sm text-destructive">
                You&apos;re signed in as {session?.user?.email}, but this invitation is for{" "}
                {info?.email}. Switch accounts to accept.
              </p>
              <Button
                className="h-12 w-full rounded-xl"
                size="lg"
                onClick={switchAccount}
                disabled={switchingAccount}
              >
                {switchingAccount ? "Signing out…" : "Switch account"}
              </Button>
            </>
          ) : signedIn && loadState === "ready" ? (
            <Button className="h-12 w-full rounded-xl" size="lg" onClick={accept} disabled={loading}>
              {loading ? "Joining..." : "Accept invitation"}
            </Button>
          ) : loadState === "ready" ? (
            <>
              <Link href={loginHref}>
                <Button className="h-12 w-full rounded-xl" size="lg">
                  Log in to accept
                </Button>
              </Link>
              <p className="text-center text-sm text-muted-foreground">
                Need an account?{" "}
                <Link href={registerHref} className="text-primary underline">
                  Create one
                </Link>{" "}
                with the invited email, verify it, then return here.
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
