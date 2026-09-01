"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { logoutUser } from "@/lib/auth/logout-client";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { requireField } from "@/lib/api/validation";
import { getBusinessTypeConfig, isShopVertical } from "@/lib/org/business-type";
import { getShopSectorConfig } from "@/lib/org/shop-sector";
import {
  SettingsCardGrid,
  settingsCardClass,
} from "@/components/settings/settings-page-shell";
import { cn } from "@/lib/utils";

export default function SettingsProfilePage() {
  const {
    user,
    activeOrganizationName,
    activeBusinessType,
    activeShopSector,
    enabledModules,
    role,
    status,
    initialized,
    isPlatformAdmin,
    updateUser,
  } = useAuthStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  const { warning, error, clear, showWarning, applyError } = useFormFeedback();
  const {
    warning: passwordWarning,
    error: passwordError,
    clear: clearPasswordFeedback,
    showWarning: showPasswordWarning,
    applyError: applyPasswordError,
  } = useFormFeedback();

  const isOrgOwner = role === "OWNER";

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

  async function handleLogout() {
    await logoutUser();
  }

  return (
    <div className="space-y-5">
      <SettingsCardGrid>
        <Card className={settingsCardClass}>
          <CardHeader>
            <CardTitle>Your details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormFeedback warning={warning} error={error} />
            {savedMessage ? (
              <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
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

        <Card className={settingsCardClass}>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormFeedback warning={passwordWarning} error={passwordError} />
            {passwordMessage ? (
              <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
                {passwordMessage}
              </p>
            ) : null}

            <div className="space-y-2">
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

            <Button
              className="h-12 w-full rounded-xl"
              onClick={changePassword}
              disabled={changingPassword}
            >
              {changingPassword ? "Updating..." : "Update password"}
            </Button>
          </CardContent>
        </Card>

        <Card className={cn(settingsCardClass, "lg:col-span-2")}>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium">{activeOrganizationName ?? "—"}</p>
              <p className="text-sm text-muted-foreground">
                {getBusinessTypeConfig(activeBusinessType).label}
                {isShopVertical(activeBusinessType) && activeShopSector
                  ? ` · ${getShopSectorConfig(activeShopSector).label}`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isOrgOwner ? (
                <Link href="/settings/organization">
                  <Button variant="outline" className="rounded-xl">
                    Organization
                  </Button>
                </Link>
              ) : null}
              {isOrgOwner ? (
                <Link href="/settings/members">
                  <Button variant="outline" className="rounded-xl">
                    Members
                  </Button>
                </Link>
              ) : null}
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
                    Ops dashboard
                  </Button>
                </Link>
              ) : null}
              {enabledModules.staff ? (
                <Link href="/staff">
                  <Button variant="outline" className="rounded-xl">
                    Staff
                  </Button>
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(settingsCardClass, "lg:col-span-2")}>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Sign out</p>
              <p className="text-sm text-muted-foreground">
                Log out of BusinessOS on this device.
              </p>
            </div>
            <Button variant="outline" className="shrink-0 rounded-xl" onClick={handleLogout}>
              Logout
            </Button>
          </CardContent>
        </Card>
      </SettingsCardGrid>
    </div>
  );
}
