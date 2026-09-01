import { prisma } from "@/lib/db/prisma";
import { isShopVertical } from "@/lib/org/business-type";
import { parseOrgSettings } from "@/lib/org/require-module";

export type OrgSetupStatus = {
  onboardingCompleteAt: string | null;
  requiredComplete: boolean;
  items: Array<{
    id: string;
    label: string;
    complete: boolean;
    optional?: boolean;
    href?: string;
  }>;
};

export async function getOrgSetupStatus(organizationId: string): Promise<OrgSetupStatus> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      businessType: true,
      onboardingCompleteAt: true,
      settings: true,
    },
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  const settings = parseOrgSettings(org.settings);
  const items: OrgSetupStatus["items"] = [
    {
      id: "org_named",
      label: "Organization named",
      complete: org.name.trim().length >= 2,
    },
  ];

  if (isShopVertical(org.businessType)) {
    const productCount = await prisma.shopProduct.count({
      where: { organizationId, deletedAt: null },
    });
    const invoice = settings.shop?.invoice;
    const invoiceConfigured = Boolean(
      invoice?.gstin?.trim() ||
        invoice?.footerText?.trim() ||
        invoice?.displayName?.trim() ||
        settings.shop?.brandName?.trim()
    );

    items.push(
      {
        id: "catalog",
        label: "Add at least one product",
        complete: productCount > 0,
        href: "/shop/inventory",
      },
      {
        id: "invoice_template",
        label: "Configure invoice template",
        complete: invoiceConfigured,
        href: "/shop/invoices/settings",
      }
    );
  } else if (org.businessType === "CONTRACTOR" || org.businessType === "ARCHITECT") {
    const projectCount = await prisma.project.count({
      where: { organizationId, deletedAt: null },
    });
    items.push({
      id: "first_project",
      label: "Create first project or work order",
      complete: projectCount > 0,
      href: "/projects",
    });
  }

  const memberCount = await prisma.organizationMember.count({
    where: { organizationId, status: "ACTIVE" },
  });
  items.push({
    id: "team",
    label: "Invite a team member",
    complete: memberCount > 1,
    optional: true,
    href: "/settings/members",
  });

  const requiredComplete = items.filter((i) => !i.optional).every((i) => i.complete);

  return {
    onboardingCompleteAt: org.onboardingCompleteAt?.toISOString() ?? null,
    requiredComplete,
    items,
  };
}
