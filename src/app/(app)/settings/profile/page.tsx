"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { requireField } from "@/lib/api/validation";

export default function SettingsProfilePage() {
  const { user, activeOrganizationName, status, initialized, updateUser, logout } =
    useAuthStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone ?? "");
    }
  }, [user]);

  if (!initialized || status === "loading") return <PageLoader label="Loading profile..." />;

  async function saveProfile() {
    clear();
    setSavedMessage("");

    const validationMessage = requireField(name, "name");
    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    setSaving(true);
    try {
      const updated = await apiFetch<{
        id: string;
        email: string;
        name: string;
        phone: string | null;
      }>("/api/v1/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
        }),
      });

      updateUser({ name: updated.name, phone: updated.phone });
      setName(updated.name);
      setPhone(updated.phone ?? "");
      setSavedMessage("Profile updated");
    } catch (err) {
      applyError(err, "Could not update profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    logout();
    window.location.href = "/login";
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold sm:text-3xl">Profile</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader>
            <CardTitle>Your details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormFeedback warning={warning} error={error} />
            {savedMessage ? (
              <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                {savedMessage}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl"
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                value={user?.email ?? ""}
                readOnly
                disabled
                className="h-12 rounded-xl bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input
                id="profile-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
                className="h-12 rounded-xl"
                autoComplete="tel"
              />
            </div>

            <Button
              className="h-12 w-full rounded-xl"
              onClick={saveProfile}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              <strong>{activeOrganizationName ?? "—"}</strong>
            </p>
            <Link href="/settings/members">
              <Button variant="outline" className="rounded-xl">
                Manage Members
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Sign out</p>
            <p className="text-sm text-muted-foreground">
              Log out of Project Z on this device.
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={handleLogout}>
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
