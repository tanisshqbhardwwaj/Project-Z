import type { OrgRole } from "@prisma/client";
import { defaultStaffAccess, type StaffAccess } from "@/lib/staff/access";
import { shopStaffAccessApplies } from "@/lib/staff/shop-staff-gate";

export function isPlaceholderInviteEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@placeholder.local");
}

/** Link-style invites have no intended inbox; email invites must match the signed-in user. */
export function inviteEmailMatchesUser(
  inviteEmail: string,
  userEmail: string | null | undefined
): boolean {
  if (isPlaceholderInviteEmail(inviteEmail)) return true;
  if (!userEmail) return false;
  return inviteEmail.trim().toLowerCase() === userEmail.trim().toLowerCase();
}

export function emailsForStaffLink(
  inviteEmail: string,
  userEmail: string | null | undefined
): string[] {
  const emails = new Set<string>();
  const invite = inviteEmail.trim().toLowerCase();
  const user = userEmail?.trim().toLowerCase();
  if (invite && !isPlaceholderInviteEmail(invite)) emails.add(invite);
  if (user) emails.add(user);
  return [...emails];
}

export type InviteTokenStatus =
  | "ok"
  | "not_found"
  | "already_accepted"
  | "expired";

export function classifyInviteToken(invite: {
  acceptedAt: Date | null;
  expiresAt: Date;
} | null): InviteTokenStatus {
  if (!invite) return "not_found";
  if (invite.acceptedAt) return "already_accepted";
  if (invite.expiresAt < new Date()) return "expired";
  return "ok";
}

export const INVITE_STATUS_MESSAGES: Record<
  Exclude<InviteTokenStatus, "ok">,
  { status: number; code: string; message: string }
> = {
  not_found: {
    status: 404,
    code: "INVITE_NOT_FOUND",
    message: "This invitation link is invalid.",
  },
  already_accepted: {
    status: 410,
    code: "INVITE_ALREADY_ACCEPTED",
    message: "This invitation was already accepted. Log in to open the workspace.",
  },
  expired: {
    status: 410,
    code: "INVITE_EXPIRED",
    message: "This invitation has expired. Ask the owner to send a new one from Staff.",
  },
};

/** Safe relative path for post-verify / post-login redirects. */
export function safeInviteNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return null;
  }
  if (trimmed.startsWith("/invite/") || trimmed.startsWith("/project-invite/")) {
    return trimmed;
  }
  return null;
}

export function staffHomePath(access: StaffAccess): string {
  if (access.canBill) return "/shop/invoices/new";
  if (access.canViewOwnSales) return "/shop/invoices";
  if (access.canProcessReturns) return "/shop/returns";
  if (access.canViewOwnAttendance) return "/staff/me";
  return "/cashier";
}

export function inviteLandingPath(input: {
  role: OrgRole;
  businessType: string | null | undefined;
  staffAccess: StaffAccess | null;
}): string {
  if (shopStaffAccessApplies({ role: input.role, businessType: input.businessType })) {
    return staffHomePath(input.staffAccess ?? defaultStaffAccess());
  }
  return "/dashboard";
}
