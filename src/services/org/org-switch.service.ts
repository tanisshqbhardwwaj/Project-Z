import type { BusinessType, OrgRole, ShopSector } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { modulesPayloadForClient } from "@/lib/org/require-module";
import { parseStaffAccess } from "@/lib/staff/access";
import { readStaffAccessJsonMap } from "@/lib/staff/access-storage";
import { isShopVertical } from "@/lib/org/business-type";
import type { OrgSettingsJson } from "@/lib/org/modules";
import type { EnabledModulesMap } from "@/hooks/use-enabled-modules";

export type OrgSwitchContext = {
  id: string;
  name: string;
  role: OrgRole;
  businessType: BusinessType;
  shopSector: ShopSector | null;
  enableStaff: boolean;
  timezone: string;
  enabledModules: EnabledModulesMap;
  orgSettings: OrgSettingsJson;
  plan: string;
  subscriptionStatus: string;
  linkedStaff: {
    id: string;
    name: string;
    access: ReturnType<typeof parseStaffAccess>;
  } | null;
};

export function resolveRedirectAfterSwitch(
  businessType: BusinessType,
  returnTo?: string | null
): string {
  if (returnTo && isReturnToSafeForBusinessType(returnTo, businessType)) {
    return returnTo;
  }
  return "/dashboard";
}

function isReturnToSafeForBusinessType(path: string, businessType: BusinessType): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (path.startsWith("/settings") || path.startsWith("/notifications") || path.startsWith("/dashboard")) {
    return true;
  }
  if (path.startsWith("/shop") || path.startsWith("/restaurant") || path.startsWith("/deliveries")) {
    return isShopVertical(businessType);
  }
  if (path.startsWith("/contractor") || path.startsWith("/work-orders") || path.startsWith("/projects")) {
    return businessType === "CONTRACTOR" || businessType === "ARCHITECT";
  }
  if (path.startsWith("/service")) {
    return businessType === "SERVICE";
  }
  if (path.startsWith("/architect")) {
    return businessType === "ARCHITECT";
  }
  if (path.startsWith("/staff") || path.startsWith("/cashier")) {
    return true;
  }
  return false;
}

export async function buildOrgSwitchContext(
  userId: string,
  organizationId: string
): Promise<OrgSwitchContext | null> {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          businessType: true,
          shopSector: true,
          enableStaff: true,
          timezone: true,
          settings: true,
          plan: true,
          subscriptionStatus: true,
        },
      },
    },
  });

  if (!member || member.status !== "ACTIVE") return null;

  const linkedStaff = await prisma.staffMember.findFirst({
    where: {
      userId,
      organizationId,
      status: "ACTIVE",
    },
    select: { id: true, name: true },
  });

  let staffAccess = parseStaffAccess(null);
  if (linkedStaff) {
    const accessMap = await readStaffAccessJsonMap([linkedStaff.id]);
    staffAccess = accessMap.get(linkedStaff.id) ?? parseStaffAccess(null);
  }

  const { enabledModules, settings } = modulesPayloadForClient({
    businessType: member.organization.businessType,
    shopSector: member.organization.shopSector,
    settings: member.organization.settings,
    enableStaff: member.organization.enableStaff,
  });

  return {
    id: member.organization.id,
    name: member.organization.name,
    role: member.role,
    businessType: member.organization.businessType,
    shopSector: member.organization.shopSector,
    enableStaff: member.organization.enableStaff,
    timezone: member.organization.timezone,
    enabledModules,
    orgSettings: settings,
    plan: member.organization.plan,
    subscriptionStatus: member.organization.subscriptionStatus,
    linkedStaff: linkedStaff
      ? { id: linkedStaff.id, name: linkedStaff.name, access: staffAccess }
      : null,
  };
}
