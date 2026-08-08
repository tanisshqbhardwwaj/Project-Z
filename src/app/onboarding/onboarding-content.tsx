"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/page-loader";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { requireField } from "@/lib/api/validation";

export default function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewOrg = searchParams.get("new") === "1";
  const { bootstrap, status, initialized } = useAuthStore();
  const [name, setName] = useState("");
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const [loading, setLoading] = useState(false);
  const [orgCount, setOrgCount] = useState(0);

  useEffect(() => {
    if (!initialized) bootstrap();
  }, [initialized, bootstrap]);

  useEffect(() => {
    fetch("/api/v1/organizations/list")
      .then((r) => r.json())
      .then((d) => {
        const count = d.data?.organizations?.length ?? 0;
        setOrgCount(count);
        if (count > 0 && !isNewOrg && status === "authenticated") {
          router.replace("/dashboard");
        }
      });
  }, [isNewOrg, router, status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clear();

    const validationMessage = requireField(name, "organization name");
    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    setLoading(true);

    try {
      await apiFetch("/api/v1/organizations", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await bootstrap();
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      applyError(err, "Failed to create organization");
    } finally {
      setLoading(false);
    }
  }

  if (!initialized) return <PageLoader label="Loading..." />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 w-full max-w-lg">
        <AppLogo href="/dashboard" variant="full" className="mx-auto w-full" />
      </div>
      <Card className="w-full max-w-lg rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isNewOrg ? "Create Organization" : "Welcome to Project Z"}
          </CardTitle>
          <CardDescription>
            {isNewOrg
              ? `Add another organization (${orgCount}/3 used)`
              : "Create your organization to start managing work orders"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormFeedback warning={warning} error={error} />
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization name</Label>
              <Input
                id="orgName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>
            <Button type="submit" className="h-12 w-full rounded-xl" size="lg" disabled={loading}>
              {loading ? "Creating..." : "Create Organization"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
