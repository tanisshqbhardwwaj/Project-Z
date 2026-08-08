"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/brand/app-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { humanizeErrorMessage } from "@/lib/api/validation";

export default function ProjectInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [info, setInfo] = useState<{
    projectName: string;
    workOrderNumber: string | null;
    organizationName: string;
  } | null>(null);
  const { warning, error, clear, applyResponseError, showError } = useFormFeedback();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/project-invite/${token}/accept`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setInfo(d.data);
        else showError(humanizeErrorMessage(d.error?.message ?? "Invalid invitation", d.error?.details));
      })
      .catch(() => showError("Could not load invitation"));
  }, [token]);

  async function accept() {
    setLoading(true);
    clear();
    const res = await fetch(`/api/v1/project-invite/${token}/accept`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      const isPending = data.data?.status === "PENDING";
      setPending(isPending);
      setDone(true);
      if (!isPending) {
        const pid = data.data?.project?.id;
        setTimeout(() => {
          router.push(pid ? `/projects/${pid}?partners=open` : "/projects");
        }, 2000);
      }
    } else {
      applyResponseError(data, "Could not accept invitation");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 w-full max-w-md">
        <AppLogo href="/login" variant="full" className="mx-auto w-full" />
      </div>
      <Card className="w-full max-w-md rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle>Work Order Partner Invite</CardTitle>
          <CardDescription>
            Join as a partner on this specific work order — not the full organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {info && (
            <div className="rounded-xl bg-muted/60 p-4 text-sm">
              <p className="font-medium">{info.projectName}</p>
              {info.workOrderNumber && (
                <p className="text-muted-foreground">WO #{info.workOrderNumber}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{info.organizationName}</p>
            </div>
          )}
          <FormFeedback warning={warning} error={error} />
          {done ? (
            pending ? (
              <p className="text-sm text-amber-700">
                Your request was sent. The work order owner must approve you before you can access
                it. You will get a notification when approved.
              </p>
            ) : (
              <p className="text-sm text-green-700">You joined this work order. Redirecting...</p>
            )
          ) : (
            <>
              <Button className="h-12 w-full rounded-xl" size="lg" onClick={accept} disabled={loading || !info}>
                {loading ? "Sending request..." : "Request to Join"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Need an account?{" "}
                <Link href="/register" className="text-primary underline">
                  Sign up
                </Link>{" "}
                first, then return here.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
