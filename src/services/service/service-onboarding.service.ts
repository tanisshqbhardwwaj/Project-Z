import { prisma } from "@/lib/db/prisma";
import { INFINITE_STOCK_QTY } from "@/lib/shop/inventory/inventory";

const SAMPLE_SERVICES = [
  { name: "Haircut", categoryKey: "salon", duration: 30, priceRupees: 300 },
  { name: "Facial", categoryKey: "salon", duration: 45, priceRupees: 800 },
  { name: "General Repair", categoryKey: "repair", duration: 60, priceRupees: 500 },
  { name: "Consultation", categoryKey: "professional", duration: 30, priceRupees: 1000 },
];

/** Seed sample service catalog rows for new SERVICE orgs. */
export async function seedSampleServicesForOrg(input: {
  organizationId: string;
  createdById: string;
  branchId?: string | null;
}) {
  const existing = await prisma.shopProduct.count({
    where: { organizationId: input.organizationId, itemKind: "SERVICE", deletedAt: null },
  });
  if (existing > 0) return { seeded: 0 };

  let branchId = input.branchId ?? null;
  if (!branchId) {
    const branch = await prisma.shopBranch.findFirst({
      where: { organizationId: input.organizationId, isActive: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    branchId = branch?.id ?? null;
  }

  let seeded = 0;
  for (const svc of SAMPLE_SERVICES) {
    const product = await prisma.shopProduct.create({
      data: {
        organizationId: input.organizationId,
        itemKind: "SERVICE",
        name: svc.name,
        categoryKey: svc.categoryKey,
        unit: "session",
        attributes: { durationMinutes: svc.duration },
        createdById: input.createdById,
      },
    });
    await prisma.inventoryItem.create({
      data: {
        organizationId: input.organizationId,
        branchId,
        productId: product.id,
        name: svc.name,
        quantity: INFINITE_STOCK_QTY,
        sellPaise: BigInt(svc.priceRupees * 100),
        sectorMeta: { durationMinutes: svc.duration },
      },
    });
    seeded++;
  }
  return { seeded };
}
