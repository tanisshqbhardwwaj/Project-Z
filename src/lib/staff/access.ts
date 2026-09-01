/** Per-staff login capabilities — all off until the owner enables them. */
export type StaffAccess = {
  canBill: boolean;
  canProcessReturns: boolean;
  canViewOwnAttendance: boolean;
  canViewOwnSales: boolean;
  canManageInventory: boolean;
  canViewAllAttendance: boolean;
  canViewAllSales: boolean;
  canViewOwnDeliveries: boolean;
  canUpdateDeliveryStatus: boolean;
};

export type StaffAccessKey = keyof StaffAccess;

export function defaultStaffAccess(): StaffAccess {
  return {
    canBill: false,
    canProcessReturns: false,
    canViewOwnAttendance: false,
    canViewOwnSales: false,
    canManageInventory: false,
    canViewAllAttendance: false,
    canViewAllSales: false,
    canViewOwnDeliveries: false,
    canUpdateDeliveryStatus: false,
  };
}

export function parseStaffAccess(raw: unknown): StaffAccess {
  const base = defaultStaffAccess();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  return {
    canBill: o.canBill === true,
    canProcessReturns: o.canProcessReturns === true,
    canViewOwnAttendance: o.canViewOwnAttendance === true,
    canViewOwnSales: o.canViewOwnSales === true,
    canManageInventory: o.canManageInventory === true,
    canViewAllAttendance: o.canViewAllAttendance === true,
    canViewAllSales: o.canViewAllSales === true,
    canViewOwnDeliveries: o.canViewOwnDeliveries === true,
    canUpdateDeliveryStatus: o.canUpdateDeliveryStatus === true,
  };
}

export function staffAccessFromForm(input: Partial<StaffAccess>): StaffAccess {
  return parseStaffAccess(input);
}

export type StaffRoleKey =
  | "OWNER"
  | "MANAGER"
  | "SALES_STAFF"
  | "CASHIER"
  | "ACCOUNTANT"
  | "INVENTORY_MANAGER"
  | "DELIVERY_STAFF"
  | "WAITER"
  | "CUSTOM";

/** Suggested capability bundles (UI does not auto-apply these — owner checks boxes). */
export const STAFF_ROLE_ACCESS_PRESETS: Record<
  StaffRoleKey,
  Partial<StaffAccess>
> = {
  OWNER: {},
  MANAGER: {
    canViewAllAttendance: true,
    canViewAllSales: true,
  },
  SALES_STAFF: {
    canViewOwnAttendance: true,
    canViewOwnSales: true,
  },
  CASHIER: {
    canBill: true,
    canViewOwnAttendance: true,
    canViewOwnSales: true,
  },
  ACCOUNTANT: {
    canViewAllSales: true,
    canViewOwnAttendance: true,
  },
  INVENTORY_MANAGER: {
    canManageInventory: true,
    canViewOwnAttendance: true,
  },
  DELIVERY_STAFF: {
    canViewOwnDeliveries: true,
    canUpdateDeliveryStatus: true,
    canViewOwnAttendance: true,
  },
  WAITER: {
    canBill: true,
    canViewOwnAttendance: true,
    canViewOwnSales: true,
  },
  CUSTOM: {
    canViewOwnAttendance: true,
    canViewOwnSales: true,
  },
};

export function accessPresetForRole(
  roleKey: string | null | undefined
): Partial<StaffAccess> {
  if (!roleKey || !(roleKey in STAFF_ROLE_ACCESS_PRESETS)) {
    return STAFF_ROLE_ACCESS_PRESETS.CUSTOM;
  }
  return STAFF_ROLE_ACCESS_PRESETS[roleKey as StaffRoleKey];
}
