"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
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
import { MAX_BETA_TEST_EMAILS } from "@/lib/email/test-allowlist";
import { getBusinessTypeConfig } from "@/lib/org/business-type";
import { getShopSectorConfig } from "@/lib/org/shop-sector";
import { Switch } from "@/components/ui/switch";
import { useCashierMode } from "@/hooks/use-cashier-mode";
import { hasPermission } from "@/lib/permissions/rbac";
import type { OrgRole } from "@prisma/client";

type BetaTestEmail = {
  id: string;
  email: string;
  createdAt: string;
  addedBy: { id: string; name: string; email: string };
};

export default function SettingsProfilePage() {
  const { user, activeOrganizationName, activeBusinessType, activeShopSector, enabledModules, role, status, initialized, isPlatformAdmin, updateUser, logout } =
    useAuthStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  const [betaEmails, setBetaEmails] = useState<BetaTestEmail[]>([]);
  const [betaEmailInput, setBetaEmailInput] = useState("");
  const [betaLoading, setBetaLoading] = useState(false);
  const [betaSaving, setBetaSaving] = useState(false);
  const [betaMessage, setBetaMessage] = useState("");

  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const {
    warning: passwordWarning,
    error: passwordError,
    clear: clearPasswordFeedback,
    showWarning: showPasswordWarning,
    applyError: applyPasswordError,
  } = useFormFeedback();
  const {
    warning: betaWarning,
    error: betaError,
    clear: clearBetaFeedback,
    showWarning: showBetaWarning,
    applyError: applyBetaError,
  } = useFormFeedback();

  const isOrgOwner = role === "OWNER";
  const { previewMode, setPreviewMode, isOwnerPreview } = useCashierMode();
  const canPreviewCashier =
    activeBusinessType === "SHOPKEEPER" &&
    role &&
    hasPermission(role as OrgRole, "shop.sales");

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone ?? "");
    }
  }, [user]);

  useEffect(() => {
    if (!isOrgOwner) return;

    setBetaLoading(true);
    apiFetch<{ emails: BetaTestEmail[]; max: number; count: number }>("/api/v1/beta-test-emails")
      .then((data) => setBetaEmails(data.emails))
      .catch(() => {})
      .finally(() => setBetaLoading(false));
  }, [isOrgOwner]);

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

  async function changePassword() {
    clearPasswordFeedback();
    setPasswordMessage("");

    if (!currentPassword) {
      showPasswordWarning("Enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      showPasswordWarning("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      showPasswordWarning("New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      await apiFetch("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated successfully");
    } catch (err) {
      applyPasswordError(err, "Could not change password");
    } finally {
      setChangingPassword(false);
    }
  }

  async function addBetaEmail() {
    clearBetaFeedback();
    setBetaMessage("");

    const email = betaEmailInput.trim().toLowerCase();
    if (!email) {
      showBetaWarning("Enter an email address");
      return;
    }

    setBetaSaving(true);
    try {
      const entry = await apiFetch<BetaTestEmail>("/api/v1/beta-test-emails", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setBetaEmails((prev) => {
        const without = prev.filter((e) => e.email !== entry.email);
        return [entry, ...without];
      });
      setBetaEmailInput("");
      setBetaMessage(`Added ${entry.email}`);
    } catch (err) {
      applyBetaError(err, "Could not add beta tester");
    } finally {
      setBetaSaving(false);
    }
  }

  async function removeBetaEmail(email: string) {
    clearBetaFeedback();
    setBetaMessage("");

    setBetaSaving(true);
    try {
      await apiFetch("/api/v1/beta-test-emails", {
        method: "DELETE",
        body: JSON.stringify({ email }),
      });
      setBetaEmails((prev) => prev.filter((e) => e.email !== email));
      setBetaMessage(`Removed ${email}`);
    } catch (err) {
      applyBetaError(err, "Could not remove beta tester");
    } finally {
      setBetaSaving(false);
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
            <p className="text-sm text-muted-foreground">
              {getBusinessTypeConfig(activeBusinessType).label}
              {activeBusinessType === "SHOPKEEPER" && activeShopSector
                ? ` · ${getShopSectorConfig(activeShopSector).label}`
                : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/settings/organization">
                <Button variant="outline" className="rounded-xl">
                  Manage Organization
                </Button>
              </Link>
              <Link href="/settings/members">
                <Button variant="outline" className="rounded-xl">
                  Manage Members
                </Button>
              </Link>
              {isOrgOwner ? (
                <Link href="/settings/billing">
                  <Button variant="outline" className="rounded-xl">
                    Billing
                  </Button>
                </Link>
              ) : null}
              {isPlatformAdmin ? (
                <Link href="/ops">
                  <Button variant="outline" className="rounded-xl">
                    Owner dashboard
                  </Button>
                </Link>
              ) : null}
              {enabledModules.staff && (
                <Link href="/staff">
                  <Button variant="outline" className="rounded-xl">
                    Staff & payroll
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {canPreviewCashier ? (
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader>
              <CardTitle>Cashier preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                See the simplified counter UI your cashiers get — billing, scan, returns
                only. Your owner permissions stay the same; this only changes navigation.
              </p>
              <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <div>
                  <p className="text-sm font-medium">Cashier mode preview</p>
                  <p className="text-xs text-muted-foreground">
                    {isOwnerPreview ? "On — open Cashier home from the sidebar" : "Off — full owner menu"}
                  </p>
                </div>
                <Switch
                  checked={previewMode}
                  onCheckedChange={setPreviewMode}
                  aria-label="Toggle cashier preview"
                />
              </div>
              {previewMode ? (
                <Link href="/cashier">
                  <Button variant="outline" className="rounded-xl">
                    Open cashier home
                  </Button>
                </Link>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card className="rounded-2xl border-0 shadow-md">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormFeedback warning={passwordWarning} error={passwordError} />
          {passwordMessage ? (
            <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {passwordMessage}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-12 rounded-xl"
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-12 rounded-xl"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 rounded-xl"
                autoComplete="new-password"
              />
            </div>
          </div>

          <Button
            className="h-12 rounded-xl"
            onClick={changePassword}
            disabled={changingPassword}
          >
            {changingPassword ? "Updating..." : "Update password"}
          </Button>
        </CardContent>
      </Card>

      {isOrgOwner ? (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader>
            <CardTitle>Beta testers</CardTitle>
            <p className="text-sm text-muted-foreground">
              Allow up to {MAX_BETA_TEST_EMAILS} emails to register and sign in during beta (
              {betaEmails.length}/{MAX_BETA_TEST_EMAILS} used).
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormFeedback warning={betaWarning} error={betaError} />
            {betaMessage ? (
              <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                {betaMessage}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                placeholder="tester@example.com"
                value={betaEmailInput}
                onChange={(e) => setBetaEmailInput(e.target.value)}
                className="h-12 flex-1 rounded-xl"
                autoComplete="off"
              />
              <Button
                className="h-12 rounded-xl sm:px-6"
                onClick={addBetaEmail}
                disabled={betaSaving || betaEmails.length >= MAX_BETA_TEST_EMAILS}
              >
                {betaSaving ? "Adding..." : "Add email"}
              </Button>
            </div>

            {betaLoading ? (
              <p className="text-sm text-muted-foreground">Loading beta testers...</p>
            ) : betaEmails.length === 0 ? (
              <p className="text-sm text-muted-foreground">No beta testers added yet.</p>
            ) : (
              <ul className="divide-y rounded-xl border">
                {betaEmails.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{entry.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Added by {entry.addedBy.name}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-10 min-h-10 shrink-0 gap-2 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeBetaEmail(entry.email)}
                      disabled={betaSaving}
                      aria-label={`Remove ${entry.email}`}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="text-sm">Remove</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

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
