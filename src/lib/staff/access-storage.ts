import { prisma } from "@/lib/db/prisma";
import {
  parseStaffAccess,
  staffAccessFromForm,
  type StaffAccess,
} from "@/lib/staff/access";
import { ensureCatalogSchema } from "@/lib/shop/schema/ensure-catalog-schema";

function parseAccessJsonColumn(raw: string | null | undefined): StaffAccess {
  if (!raw) return parseStaffAccess(null);
  try {
    return parseStaffAccess(JSON.parse(raw));
  } catch {
    return parseStaffAccess(null);
  }
}

/** Persists access toggles via SQL so staff saves work before `prisma generate`. */
export async function writeStaffAccessJson(
  staffId: string,
  access: Partial<StaffAccess>
) {
  await ensureCatalogSchema();
  const json = JSON.stringify(staffAccessFromForm(access));
  await prisma.$executeRawUnsafe(
    `UPDATE "StaffMember" SET "accessJson" = ? WHERE "id" = ?`,
    json,
    staffId
  );
}

export async function readStaffAccessJson(staffId: string): Promise<StaffAccess> {
  await ensureCatalogSchema();
  const rows = await prisma.$queryRawUnsafe<
    Array<{ accessJson: string | null }>
  >(`SELECT "accessJson" FROM "StaffMember" WHERE "id" = ? LIMIT 1`, staffId);
  return parseAccessJsonColumn(rows[0]?.accessJson);
}

export async function readStaffAccessJsonMap(
  staffIds: string[]
): Promise<Map<string, StaffAccess>> {
  const map = new Map<string, StaffAccess>();
  if (staffIds.length === 0) return map;
  await ensureCatalogSchema();
  const placeholders = staffIds.map(() => "?").join(", ");
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; accessJson: string | null }>
  >(
    `SELECT "id", "accessJson" FROM "StaffMember" WHERE "id" IN (${placeholders})`,
    ...staffIds
  );
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
