import { requireModule } from "@/lib/org/require-module";
import {
  computeStaffCommission,
  describeCommission,
  listStaffCommissions,
  type CommissionConfig,
  type CommissionResult,
} from "../staff/staff-commission.service";

export type ServiceCommissionSummary = CommissionResult & {
  roleTitle: string | null;
  description: string;
};

export async function getServiceStaffCommission(input: {
  organizationId: string;
  staffId: string;
  year: number;
  month: number;
  timezone?: string;
}): Promise<ServiceCommissionSummary> {
  await requireModule(input.organizationId, "service_commissions");

  const result = await computeStaffCommission(input);
  return {
    ...result,
    roleTitle: null,
    description: describeCommission(result.config),
  };
}

export async function listServiceStaffCommissions(input: {
  organizationId: string;
  year: number;
  month: number;
  timezone?: string;
}): Promise<ServiceCommissionSummary[]> {
  await requireModule(input.organizationId, "service_commissions");

  const rows = await listStaffCommissions(input);
  return rows.map((row) => ({
    ...row,
    description: describeCommission(row.config),
  }));
}

export async function describeServiceCommissionConfig(
  config: CommissionConfig
): Promise<string> {
  return describeCommission(config);
}

export {
  computeStaffCommission,
  describeCommission,
  type CommissionConfig,
  type CommissionResult,
};
