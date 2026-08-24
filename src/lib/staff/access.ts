/** Per-staff login capabilities — all off until the owner enables them. */
export type StaffAccess = {
  canBill: boolean;
  canProcessReturns: boolean;
  canViewOwnAttendance: boolean;
  canViewOwnSales: boolean;
};

export type StaffAccessKey = keyof StaffAccess;

export function defaultStaffAccess(): StaffAccess {
  return {
    canBill: false,
    canProcessReturns: false,
    canViewOwnAttendance: false,
    canViewOwnSales: false,
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
  };
}

export function staffAccessFromForm(input: Partial<StaffAccess>): StaffAccess {
  return {
    canBill: input.canBill === true,
    canProcessReturns: input.canProcessReturns === true,
    canViewOwnAttendance: input.canViewOwnAttendance === true,
    canViewOwnSales: input.canViewOwnSales === true,
  };
}
