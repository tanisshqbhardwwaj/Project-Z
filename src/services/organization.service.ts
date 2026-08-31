import { prisma } from "@/lib/db/prisma";
import { slugify, generateToken } from "@/lib/utils";
import { seedExpenseCategories } from "../../prisma/categories";
import { sendEmail, inviteEmailHtml } from "@/lib/email";
import { createAuditLog } from "./audit.service";
import type { BusinessType, OrgRole, ShopSector } from "@prisma/client";
import { mergeModuleSettings, parseOrgSettings } from "@/lib/org/require-module";
import { mergeShopOrgSettings, type ShopOrgSettings } from "@/lib/org/shop-settings";
import { isShopSector } from "@/lib/org/shop-sector";
import { isShopVertical } from "@/lib/org/business-type";
import { isServiceVerticalEnabled } from "@/lib/org/service-vertical";
import type { ModuleKey } from "@/lib/org/modules";
import { defaultEnabledModules } from "@/lib/org/modules";
import { setupFeeForNewOrg } from "@/services/billing.service";
import { seedSampleServicesForOrg } from "@/services/service/service-onboarding.service";
import { ensureShopBranchSchema } from "@/lib/shop/ensure-shop-branch-schema";

export async function createOrganization(input: {
  name: string;
  userId: string;
  businessType?: BusinessType;
  shopSector?: ShopSector | null;
  enableStaff?: boolean;
}) {
  let slug = slugify(input.name);
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const businessType = input.businessType ?? "CONTRACTOR";
  if (businessType === "SERVICE" && !isServiceVerticalEnabled()) {
    throw new Error("Service business management is not available yet. Choose Retail Store Management instead.");
  }
  const shopSector = isShopVertical(businessType)
    ? businessType === "SERVICE"
      ? "SERVICES"
      : (input.shopSector ?? "GENERAL")
    : null;
  const enableStaff = isShopVertical(businessType)
    ? Boolean(input.enableStaff)
    : false;

  const defaultModules = defaultEnabledModules(businessType, shopSector);
  if (enableStaff) defaultModules.staff = true;
  if (shopSector === "RESTAURANT") {
    defaultModules.restaurant_tables = true;
    defaultModules.restaurant_kitchen = true;
  }

  const { setupFeePaise, earlyBird } = isShopVertical(businessType)
    ? await setupFeeForNewOrg()
    : { setupFeePaise: BigInt(0), earlyBird: false };
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true },
  });
  if (!user) {
    throw new Error(
      "Your login session is out of date (user not found). Log out, register/log in again, then create the organization."
    );
  }

  const org = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.name,
        slug,
        businessType,
        shopSector,
        enableStaff,
        settings: { modules: defaultModules },
        plan: isShopVertical(businessType) ? "BASIC" : "BUSINESS",
        subscriptionStatus: isShopVertical(businessType) ? "TRIAL" : "ACTIVE",
        storageQuotaBytes: isShopVertical(businessType)
          ? BigInt(2 * 1024 * 1024 * 1024)
          : BigInt(5 * 1024 * 1024 * 1024),
        currentPeriodEnd: isShopVertical(businessType) ? trialEnd : null,
        setupFeePaise: isShopVertical(businessType) ? setupFeePaise : null,
        setupFeeStatus: isShopVertical(businessType) ? "UNPAID" : "WAIVED",
        earlyBirdSetup: isShopVertical(businessType) ? earlyBird : false,
      },
    });

    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: input.userId,
        role: "OWNER",
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });

    return organization;
  });

  await seedExpenseCategories(prisma, org.id);

  if (businessType === "SERVICE" && isServiceVerticalEnabled()) {
    await ensureShopBranchSchema(org.id);
    const defaultBranch = await prisma.shopBranch.findFirst({
      where: { organizationId: org.id, isActive: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    await seedSampleServicesForOrg({
      organizationId: org.id,
      createdById: input.userId,
      branchId: defaultBranch?.id ?? null,
    });
  }

  await createAuditLog({
    organizationId: org.id,
    userId: input.userId,
    action: "organization.created",
    entityType: "Organization",
    entityId: org.id,
    after: org,
  });

  return org;
}

export async function createInviteLink(input: {
  organizationId: string;
  email?: string;
  role: OrgRole;
  invitedById: string;
}) {
  const token = generateToken(48);
  const invite = await prisma.organizationInvite.create({
    data: {
      organizationId: input.organizationId,
      email: (input.email ?? `invite-${token}@placeholder.local`).toLowerCase(),
      role: input.role,
      token,
      invitedById: input.invitedById,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    include: { organization: true },
  });

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;
  return { invite, url };
}

export async function inviteMember(input: {
  organizationId: string;
  email: string;
  role: OrgRole;
  invitedById: string;
  clientIp?: string;
}) {
  const { invite, url } = await createInviteLink(input);

  await sendEmail({
    to: input.email,
    subject: `Invitation to join ${invite.organization.name}`,
    html: inviteEmailHtml(invite.organization.name, url),
    clientIp: input.clientIp,
  });

  return invite;
}

export async function acceptInvite(token: string, userId: string) {
  const invite = await prisma.organizationInvite.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw new Error("Invalid or expired invitation");
  }

  const member = await prisma.$transaction(async (tx) => {
    await tx.organizationInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    return tx.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId,
        },
      },
      create: {
        organizationId: invite.organizationId,
        userId,
        role: invite.role,
        status: "ACTIVE",
        invitedAt: invite.createdAt,
        joinedAt: new Date(),
      },
      update: {
        role: invite.role,
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });
  });

  const staffByEmail = await prisma.staffMember.findFirst({
    where: {
      organizationId: invite.organizationId,
      email: invite.email.toLowerCase(),
      userId: null,
      status: "ACTIVE",
    },
  });
  if (staffByEmail) {
    await prisma.staffMember.update({
      where: { id: staffByEmail.id },
      data: { userId },
    });
  }

  return { member, organization: invite.organization };
}

export async function getOrganizationMembers(organizationId: string) {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId, status: "ACTIVE" },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { joinedAt: "asc" },
  });

  if (members.length === 0) return [];

  const projectMemberships = await prisma.projectMember.findMany({
    where: {
      userId: { in: members.map((m) => m.userId) },
      project: { organizationId, deletedAt: null },
    },
    select: {
      userId: true,
      project: { select: { id: true, name: true, nickname: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const projectsByUser = new Map<string, Array<{ id: string; name: string }>>();
  for (const membership of projectMemberships) {
    const list = projectsByUser.get(membership.userId) ?? [];
    list.push({
      id: membership.project.id,
      name: membership.project.nickname?.trim() || membership.project.name,
    });
    projectsByUser.set(membership.userId, list);
  }

  return members.map((member) => {
    const partnerProjects = projectsByUser.get(member.userId) ?? [];
    return {
      ...member,
      partnerProjectCount: partnerProjects.length,
      partnerProjects,
    };
  });
}

export async function updateOrganization(input: {
  organizationId: string;
  userId: string;
  name?: string;
  businessType?: BusinessType;
  shopSector?: ShopSector | null;
  /** Full multi-select of business types; the first entry becomes the primary. */
  shopBusinessTypes?: string[];
  shopCustomBusinessType?: string | null;
  enableStaff?: boolean;
  timezone?: string;
  defaultCompletionDays?: number;
  settings?: {
    modules?: Partial<Record<ModuleKey, boolean>>;
    weeklyOffDays?: number[];
    unmarkedDayPolicy?: "PRESENT" | "ABSENT" | "EXCLUDED";
    shop?: ShopOrgSettings;
  };
}) {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
  });
  if (!member || member.status !== "ACTIVE") {
    throw new Error("Not a member of this organization");
  }
  if (member.role !== "OWNER") {
    throw new Error("Only the organization owner can update organization settings");
  }

  const before = await prisma.organization.findUnique({
    where: { id: input.organizationId },
  });
  if (!before) throw new Error("Organization not found");

  const data: {
    name?: string;
    slug?: string;
    businessType?: BusinessType;
    shopSector?: ShopSector | null;
    enableStaff?: boolean;
    timezone?: string;
    defaultCompletionDays?: number;
    settings?: object;
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2) throw new Error("Organization name must be at least 2 characters");
    data.name = name;
    let slug = slugify(name);
    const clash = await prisma.organization.findFirst({
      where: { slug, NOT: { id: input.organizationId } },
    });
    if (clash) slug = `${slug}-${Date.now()}`;
    data.slug = slug;
  }

  if (input.businessType !== undefined) {
    if (input.businessType === "SERVICE" && !isServiceVerticalEnabled()) {
      throw new Error("Service business management is not available yet.");
    }
    data.businessType = input.businessType;
    if (!isShopVertical(input.businessType)) {
      data.shopSector = null;
      data.enableStaff = false;
    } else if (input.businessType === "SERVICE") {
      data.shopSector = "SERVICES";
    } else if (input.shopSector !== undefined) {
      data.shopSector = input.shopSector;
    } else {
      data.shopSector = "GENERAL";
    }
  } else if (input.shopSector !== undefined) {
    data.shopSector = input.shopSector;
  }

  // A shop can trade in several business types; the primary sector column stays
  // the first selection so existing single-sector behaviour is unchanged.
  if (input.shopBusinessTypes !== undefined) {
    const list = input.shopBusinessTypes.filter(isShopSector);
    if (list.length === 0) {
      throw new Error("Select at least one business type");
    }
    data.shopSector = list[0];
  }

  if (input.enableStaff !== undefined) {
    const nextType = data.businessType ?? before.businessType;
    data.enableStaff = isShopVertical(nextType) ? input.enableStaff : false;
  }

  if (input.timezone !== undefined) {
    data.timezone = input.timezone.trim() || "Asia/Kolkata";
  }

  const shopTypePatch: ShopOrgSettings = {};
  if (input.shopBusinessTypes !== undefined) {
    shopTypePatch.businessTypes = input.shopBusinessTypes.filter(isShopSector);
  }
  if (input.shopCustomBusinessType !== undefined) {
    shopTypePatch.customBusinessType = input.shopCustomBusinessType ?? "";
  }
  const hasShopTypePatch = Object.keys(shopTypePatch).length > 0;

  if (input.settings !== undefined || hasShopTypePatch) {
    const existingSettings = parseOrgSettings(before.settings);
    let nextSettings = { ...existingSettings };
    if (input.settings?.modules) {
      nextSettings = mergeModuleSettings(nextSettings, input.settings.modules);
      if (input.settings.modules.staff !== undefined) {
        data.enableStaff = Boolean(input.settings.modules.staff);
      }
    }
    if (input.settings?.weeklyOffDays) {
      nextSettings.weeklyOffDays = input.settings.weeklyOffDays;
    }
    if (input.settings?.unmarkedDayPolicy) {
      nextSettings.unmarkedDayPolicy = input.settings.unmarkedDayPolicy;
    }
    const shopPatch = { ...(input.settings?.shop ?? {}), ...shopTypePatch };
    if (Object.keys(shopPatch).length > 0) {
      nextSettings = mergeShopOrgSettings(
        nextSettings as Record<string, unknown>,
        shopPatch
      ) as typeof nextSettings;
    }
    data.settings = nextSettings;
  } else if (input.enableStaff !== undefined) {
    const existingSettings = parseOrgSettings(before.settings);
    data.settings = mergeModuleSettings(existingSettings, { staff: input.enableStaff });
  }

  if (input.defaultCompletionDays !== undefined) {
    if (input.defaultCompletionDays < 1 || input.defaultCompletionDays > 3650) {
      throw new Error("Default completion days must be between 1 and 3650");
    }
    data.defaultCompletionDays = input.defaultCompletionDays;
  }

  if (Object.keys(data).length === 0 && !input.settings && !hasShopTypePatch) {
    throw new Error("Nothing to update");
  }

  const updated = await prisma.organization.update({
    where: { id: input.organizationId },
    data,
  });

  const typeChanged =
    input.businessType && input.businessType !== before.businessType;
  const sectorChanged =
    isShopVertical(updated.businessType) &&
    input.shopSector !== undefined &&
    input.shopSector !== before.shopSector;

  if (typeChanged || sectorChanged) {
    await seedExpenseCategories(prisma, input.organizationId);
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "organization.updated",
    entityType: "Organization",
    entityId: input.organizationId,
    before,
    after: updated,
  });

  return updated;
}

export async function deleteOrganization(input: {
  organizationId: string;
  userId: string;
}) {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: input.userId, status: "ACTIVE" },
    orderBy: { joinedAt: "asc" },
    include: { organization: { select: { id: true, name: true } } },
  });

  if (memberships.length <= 1) {
    throw new Error("You cannot delete your only organization");
  }

  const primaryOrgId = memberships[0].organizationId;
  if (input.organizationId === primaryOrgId) {
    throw new Error("You cannot delete your primary organization");
  }

  const member = memberships.find((m) => m.organizationId === input.organizationId);
  if (!member) {
    throw new Error("Organization not found");
  }
  if (member.role !== "OWNER") {
    throw new Error("Only the organization owner can delete this organization");
  }

  const orgName = member.organization.name;

  await prisma.organization.delete({
    where: { id: input.organizationId },
  });

  const nextMembership = memberships.find((m) => m.organizationId === primaryOrgId)!;

  return {
    deletedOrganizationId: input.organizationId,
    deletedOrganizationName: orgName,
    nextOrganizationId: nextMembership.organizationId,
    nextOrganizationName: nextMembership.organization.name,
  };
}
