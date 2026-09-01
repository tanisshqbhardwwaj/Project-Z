import { ErrorCodes } from "../codes";

export const orgMessages: Record<string, string> = {
  [ErrorCodes.ORG_REQUIRED]: "Please select a business first.",
  [ErrorCodes.ORG_LIMIT]:
    "You can join up to 3 businesses. Leave one before joining another.",
  [ErrorCodes.SHOP_SECTOR_REQUIRED]:
    "Please choose your shop type (for example grocery, pharmacy, or clothing).",
  [ErrorCodes.INVALID_BRANCH]: "This branch isn't available. Choose another branch.",
  [ErrorCodes.ORG_WRONG_VERTICAL]:
    "This page isn't available for your organization type.",
  [ErrorCodes.MODULE_PLAN_LOCKED]:
    "This feature isn't included in your current plan. Upgrade in Billing.",
  [ErrorCodes.ORG_SETUP_INCOMPLETE]:
    "Finish organization setup on your dashboard before continuing.",
  [ErrorCodes.FORBIDDEN]: "You don't have permission to do this. Ask your owner or manager.",
  [ErrorCodes.NOT_FOUND]: "The item you're looking for wasn't found.",
  [ErrorCodes.CONFLICT]: "This already exists. Check for duplicates and try again.",
  [ErrorCodes.VALIDATION_ERROR]: "Please check your input and try again.",
};

/** Context-specific FORBIDDEN / NOT_FOUND overrides keyed by technical message. */
export const orgMessageByText: Record<string, string> = {
  "Owner access required": "Only the business owner can do this.",
  "Authentication required": "Please sign in to continue.",
  "Not a member of this organization": "You're not a member of this business.",
  "Insufficient permissions": "You don't have permission to do this. Ask your owner or manager.",
  "Viewers cannot change project data": "View-only access — you can't change this.",
  "Not allowed to change customer credit": "You can't change customer credit settings.",
  "Organization not found": "This business wasn't found. It may have been removed.",
  "Invalid or expired invitation": "This invite link is invalid or has expired. Ask for a new invite.",
  "Please log in to accept this invitation": "Please sign in to accept this invitation.",
  "Only the work order owner can invite partners":
    "Only the work order owner can invite partners.",
  "Project not found": "Work order not found.",
  "Vendor not found": "Vendor not found.",
  "Staff member not found": "Staff member not found.",
  "Branch not found": "Branch not found.",
  "Invoice not found": "Invoice not found.",
  "Expense not found": "Expense not found.",
  "Document not found": "Document not found.",
  "Extraction not found": "Document extraction not found.",
  "Not assigned to this project": "You're not assigned to this work order.",
  "Not found": "The item you're looking for wasn't found.",
};
