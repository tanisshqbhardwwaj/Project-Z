import type { FollowUpStatus } from "@prisma/client";
import { toCursorPage } from "@/lib/api/cursor-page";
import {
  createServiceFollowUp as createFollowUp,
  dismissServiceFollowUp,
  getServiceFollowUp,
  listServiceFollowUps as listFollowUps,
  updateServiceFollowUp as updateFollowUp,
} from "./service-followup.service";

export { getServiceFollowUp };

export async function listServiceFollowUps(input: {
  organizationId: string;
  customerId?: string;
  status?: string;
  from?: Date;
  to?: Date;
  cursor?: string;
  limit?: number;
}) {
  const limit = Math.min(100, Math.max(1, input.limit ?? 25));
  const rows = await listFollowUps({
    organizationId: input.organizationId,
    customerId: input.customerId,
    status: input.status as FollowUpStatus | undefined,
    from: input.from,
    to: input.to,
    limit: limit + 1,
  });
  const startIdx = input.cursor
    ? Math.max(0, rows.findIndex((row) => row.id === input.cursor) + 1)
    : 0;
  return toCursorPage(rows.slice(startIdx, startIdx + limit + 1), limit);
}

export async function createServiceFollowUp(input: {
  organizationId: string;
  userId: string;
  customerId: string;
  appointmentId?: string | null;
  dueDate: string | Date;
  note?: string | null;
}) {
  return createFollowUp({
    organizationId: input.organizationId,
    createdById: input.userId,
    customerId: input.customerId,
    appointmentId: input.appointmentId ?? null,
    dueDate: new Date(input.dueDate),
    note: input.note ?? null,
  });
}

export async function updateServiceFollowUp(input: {
  organizationId: string;
  userId: string;
  followUpId: string;
  dueDate?: string | Date;
  note?: string | null;
  status?: FollowUpStatus;
}) {
  return updateFollowUp({
    organizationId: input.organizationId,
    followUpId: input.followUpId,
    userId: input.userId,
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    note: input.note,
    status: input.status,
  });
}

export async function deleteServiceFollowUp(
  organizationId: string,
  userId: string,
  followUpId: string
) {
  return dismissServiceFollowUp({
    organizationId,
    followUpId,
    userId,
  });
}
