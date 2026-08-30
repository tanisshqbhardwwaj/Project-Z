import { prisma } from "@/lib/db/prisma";
import {
  parseStaffAccess,
  staffAccessFromForm,
  type StaffAccess,
} from "@/lib/staff/access";
import { ensureCatalogSchema } from "@/lib/shop/ensure-catalog-schema";

function parseAccessJsonColumn(raw: unknown): StaffAccess {
  return parseStaffAccess(raw);
}

/** Persists access toggles on StaffMember.accessJson. */
export async function writeStaffAccessJson(
  staffId: string,
  access: Partial<StaffAccess>
) {
  await ensureCatalogSchema();
  await prisma.staffMember.update({
    where: { id: staffId },
    data: { accessJson: staffAccessFromForm(access) },
  });
}

export async function readStaffAccessJson(staffId: string): Promise<StaffAccess> {
  await ensureCatalogSchema();
  const row = await prisma.staffMember.findUnique({
    where: { id: staffId },
    select: { accessJson: true },
  });
  return parseAccessJsonColumn(row?.accessJson);
}

export async function readStaffAccessJsonMap(
  staffIds: string[]
): Promise<Map<string, StaffAccess>> {
  const map = new Map<string, StaffAccess>();
  if (staffIds.length === 0) return map;
  await ensureCatalogSchema();
  const rows = await prisma.staffMember.findMany({
    where: { id: { in: staffIds } },
    select: { id: true, accessJson: true },
  });
  for (const row of rows) {
    map.set(row.id, parseAccessJsonColumn(row.accessJson));
  }
  return map;
}

export async function attachStaffAccessJson<T extends { id: string }>(
  rows: T[]
): Promise<Array<T & { accessJson: StaffAccess }>> {
  const accessMap = await readStaffAccessJsonMap(rows.map((r) => r.id));
  return rows.map((row) => ({
    ...row,
    accessJson: accessMap.get(row.id) ?? parseStaffAccess(null),
  }));
}
