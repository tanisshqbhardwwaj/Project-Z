"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/brand/app-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { warning, error, clear, applyResponseError } = useFormFeedback();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [orgName, setOrgName] = useState("");

  async function accept() {
    setLoading(true);
    clear();
    const res = await fetch(`/api/v1/invite/${token}/accept`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setDone(true);
      setOrgName(data.data?.organization?.name ?? "the organization");
      setTimeout(() => router.push("/dashboard"), 2000);
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
          <CardTitle>Partner Invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join a project organization on Project Z.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormFeedback warning={warning} error={error} />
          {done ? (
            <p className="text-sm text-green-700">
              Welcome! You joined {orgName}. Redirecting...
            </p>
          ) : (
            <>
              <Button className="h-12 w-full rounded-xl" size="lg" onClick={accept} disabled={loading}>
                {loading ? "Joining..." : "Accept Invitation"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Need an account?{" "}
                <Link href="/register" className="text-primary underline">
                  Sign up
                </Link>{" "}
                first, then return to this link.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
