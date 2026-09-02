import type { OrgSettingsJson } from "@/lib/org/modules";

export type StaffBarcodeLabelFields = {
  showName: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showRole: boolean;
  showOrgName: boolean;
};

export const DEFAULT_STAFF_BARCODE_LABEL: StaffBarcodeLabelFields = {
  showName: true,
  showPhone: true,
  showEmail: false,
  showRole: true,
  showOrgName: true,
};

export function readStaffBarcodeLabelSettings(
  settings: OrgSettingsJson | null | undefined
): StaffBarcodeLabelFields {
  const raw = settings?.staffBarcodeLabel;
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STAFF_BARCODE_LABEL };
  const o = raw as Record<string, unknown>;
  return {
    showName: o.showName !== false,
    showPhone: o.showPhone !== false,
    showEmail: o.showEmail === true,
    showRole: o.showRole !== false,
    showOrgName: o.showOrgName !== false,
  };
}
