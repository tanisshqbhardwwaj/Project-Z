import { ErrorCodes } from "../codes";

export const billingMessages: Record<string, string> = {
  [ErrorCodes.PLAN_UPGRADE_REQUIRED]:
    "This feature needs a higher plan. Go to Settings → Billing to upgrade.",
  [ErrorCodes.CLOUD_DISABLED]:
    "Cloud backup and storage aren't included in your current plan.",
  [ErrorCodes.SUBSCRIPTION_INACTIVE]:
    "Your subscription isn't active. Renew in Billing to continue.",
  [ErrorCodes.ALREADY_CANCELLED]: "Your subscription is already cancelled.",
  [ErrorCodes.CONFIRM_MISMATCH]:
    "Business name doesn't match. Type it exactly as shown.",
  [ErrorCodes.NO_DATA]: "Backup file is empty. Nothing to upload.",
  [ErrorCodes.INVALID_PAIRING]: "Pairing code is incorrect.",
  [ErrorCodes.PAIRING_EXPIRED]: "Pairing code expired. Generate a new one on desktop.",
};

export const billingMessageByText: Record<string, string> = {
  "Cloud backup is not available.": "Cloud backup isn't available on your plan.",
  "Cloud storage is not available for this subscription.":
    "Cloud storage isn't available on your subscription.",
  "Active subscription required.": "An active subscription is required.",
};
