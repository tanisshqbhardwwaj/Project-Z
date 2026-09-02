import { parseYearMonth } from "@/lib/date/org-day";
import { isBranchAll } from "@/lib/shop/branch/branch-context";
import {
  computeStaffCommission,
  listServiceStaffCommissions,
} from "./service-commission.service";

export async function listServiceCommissions(input: {
  organizationId: string;
  staffId?: string;
  year?: number;
  month?: number;
  from?: Date;
  to?: Date;
}) {
  const { year, month } = parseYearMonth({
    year: input.year,
    month: input.month,
  });

  if (input.staffId) {
    const row = await computeStaffCommission({
      organizationId: input.organizationId,
      staffId: input.staffId,
      year,
      month,
    });
    return [row];
  }

  return listServiceStaffCommissions({
    organizationId: input.organizationId,
    year,
    month,
  });
}

export { listServiceStaffCommissions as listAllServiceCommissions };
