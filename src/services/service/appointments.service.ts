import type { AppointmentStatus } from "@prisma/client";
import { toCursorPage } from "@/lib/api/cursor-page";
import { isBranchAll } from "@/lib/shop/branch-context";
import {
  cancelServiceAppointment,
  checkStaffAppointmentConflict,
  completeServiceAppointment,
  createServiceAppointment,
  getServiceAppointment,
  listAppointmentsForCalendar,
  listServiceAppointments,
  updateServiceAppointment,
  type ServiceAppointmentItem,
} from "./service-appointment.service";

export {
  checkStaffAppointmentConflict,
  type ServiceAppointmentItem,
};

export async function listAppointments(input: {
  organizationId: string;
  branchId?: string;
  status?: string;
  staffId?: string;
  customerId?: string;
  from?: Date;
  to?: Date;
  cursor?: string;
  limit?: number;
}) {
  const limit = Math.min(100, Math.max(1, input.limit ?? 25));
  const rows = await listServiceAppointments({
    organizationId: input.organizationId,
    branchId:
      input.branchId && !isBranchAll(input.branchId) ? input.branchId : undefined,
    staffId: input.staffId,
    customerId: input.customerId,
    status: input.status as AppointmentStatus | undefined,
    from: input.from,
    to: input.to,
    limit: limit + 1,
  });

  const startIdx = input.cursor
    ? Math.max(0, rows.findIndex((row) => row.id === input.cursor) + 1)
    : 0;
  const slice = rows.slice(startIdx, startIdx + limit + 1);
  return toCursorPage(slice, limit);
}

export async function createAppointment(input: {
  organizationId: string;
  userId: string;
  branchId?: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  staffId?: string | null;
  items: ServiceAppointmentItem[];
  startAt: string | Date;
  endAt: string | Date;
  notes?: string | null;
  source?: string | null;
  customerPackageId?: string | null;
  status?: AppointmentStatus;
}) {
  return createServiceAppointment({
    organizationId: input.organizationId,
    createdById: input.userId,
    branchId: input.branchId ?? null,
    customerId: input.customerId ?? null,
    customerName: input.customerName ?? null,
    customerPhone: input.customerPhone ?? null,
    staffId: input.staffId ?? null,
    items: input.items,
    startAt: new Date(input.startAt),
    endAt: new Date(input.endAt),
    notes: input.notes ?? null,
    source: input.source ?? null,
    customerPackageId: input.customerPackageId ?? null,
    status: input.status,
  });
}

export async function getAppointment(organizationId: string, appointmentId: string) {
  return getServiceAppointment(organizationId, appointmentId);
}

export async function updateAppointment(input: {
  organizationId: string;
  userId: string;
  appointmentId: string;
  branchId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  staffId?: string | null;
  items?: ServiceAppointmentItem[];
  startAt?: string | Date;
  endAt?: string | Date;
  notes?: string | null;
  source?: string | null;
  customerPackageId?: string | null;
  status?: AppointmentStatus;
}) {
  return updateServiceAppointment({
    organizationId: input.organizationId,
    appointmentId: input.appointmentId,
    userId: input.userId,
    branchId: input.branchId,
    customerId: input.customerId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    staffId: input.staffId,
    items: input.items,
    startAt: input.startAt ? new Date(input.startAt) : undefined,
    endAt: input.endAt ? new Date(input.endAt) : undefined,
    notes: input.notes,
    source: input.source,
    customerPackageId: input.customerPackageId,
    status: input.status,
  });
}

export async function deleteAppointment(
  organizationId: string,
  userId: string,
  appointmentId: string
) {
  return cancelServiceAppointment({
    organizationId,
    appointmentId,
    userId,
  });
}

export async function getAppointmentCalendar(input: {
  organizationId: string;
  branchId?: string;
  staffId?: string;
  from: Date;
  to: Date;
}) {
  return listAppointmentsForCalendar({
    organizationId: input.organizationId,
    from: input.from,
    to: input.to,
    branchId:
      input.branchId && !isBranchAll(input.branchId) ? input.branchId : undefined,
    staffId: input.staffId,
  });
}

export async function completeAppointmentToInvoice(input: {
  organizationId: string;
  userId: string;
  appointmentId: string;
  branchId?: string;
  paymentMethod?: "CASH" | "UPI" | "CARD" | "BANK" | "OTHER" | "CREDIT";
  paidRupees?: number;
  issueInvoice?: boolean;
  redeemPackage?: boolean;
  notes?: string | null;
}) {
  if (!input.branchId) throw new Error("Branch is required to complete appointment");

  return completeServiceAppointment({
    organizationId: input.organizationId,
    appointmentId: input.appointmentId,
    branchId: input.branchId,
    createdById: input.userId,
    paymentMethod: input.paymentMethod,
    paidRupees: input.paidRupees,
    issueInvoice: input.issueInvoice,
    redeemPackage: input.redeemPackage,
    notes: input.notes,
  });
}
