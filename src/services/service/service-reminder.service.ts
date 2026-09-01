import { prisma } from "@/lib/db/prisma";
import { upsertUnreadAlertNotification } from "@/services/shared/notification.service";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function listServiceOrgsForReminders() {
  const orgs = await prisma.organization.findMany({
    where: { businessType: "SERVICE" },
    select: { id: true },
  });
  return orgs.map((o) => o.id);
}

export async function syncAppointmentReminders(organizationId: string) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const from = startOfDay(tomorrow);
  const to = endOfDay(tomorrow);

  const appointments = await prisma.serviceAppointment.findMany({
    where: {
      organizationId,
      status: { in: ["BOOKED", "CONFIRMED"] },
      startAt: { gte: from, lte: to },
      reminderSentAt: null,
    },
    take: 100,
  });

  const owners = await prisma.organizationMember.findMany({
    where: { organizationId, role: "OWNER", status: "ACTIVE" },
    select: { userId: true },
  });

  let count = 0;
  for (const appt of appointments) {
    const label = appt.customerName ?? appt.customerPhone ?? "Customer";
    for (const owner of owners) {
      await upsertUnreadAlertNotification({
        organizationId,
        userId: owner.userId,
        type: "service.appointment_reminder",
        alertKey: `appt-${appt.id}`,
        title: "Booking tomorrow",
        body: `${label} — ${appt.startAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
        metadata: { appointmentId: appt.id },
        href: `/service/appointments/${appt.id}`,
      });
    }
    await prisma.serviceAppointment.update({
      where: { id: appt.id },
      data: { reminderSentAt: new Date() },
    });
    count++;
  }
  return { count };
}

export async function syncAmcRenewalReminders(organizationId: string) {
  const now = new Date();
  const contracts = await prisma.serviceContract.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      nextServiceDate: { not: null },
    },
    include: { customer: { select: { name: true } } },
    take: 100,
  });

  const owners = await prisma.organizationMember.findMany({
    where: { organizationId, role: "OWNER", status: "ACTIVE" },
    select: { userId: true },
  });

  let count = 0;
  for (const contract of contracts) {
    if (!contract.nextServiceDate) continue;
    const daysBefore = contract.reminderDaysBefore ?? 7;
    const remindAt = new Date(contract.nextServiceDate);
    remindAt.setDate(remindAt.getDate() - daysBefore);
    if (now < remindAt || now > contract.nextServiceDate) continue;

    for (const owner of owners) {
      await upsertUnreadAlertNotification({
        organizationId,
        userId: owner.userId,
        type: "service.amc_renewal",
        alertKey: `amc-${contract.id}-${contract.nextServiceDate.toISOString().slice(0, 10)}`,
        title: "AMC service due",
        body: `${contract.name} for ${contract.customer.name} on ${contract.nextServiceDate.toLocaleDateString("en-IN")}`,
        metadata: { contractId: contract.id },
        href: `/service/contracts/${contract.id}`,
      });
    }
    count++;
  }
  return { count };
}

export async function syncFollowUpReminders(organizationId: string) {
  const today = endOfDay(new Date());
  const followUps = await prisma.serviceFollowUp.findMany({
    where: {
      organizationId,
      status: "PENDING",
      dueDate: { lte: today },
    },
    include: { customer: { select: { name: true } } },
    take: 100,
  });

  const owners = await prisma.organizationMember.findMany({
    where: { organizationId, role: "OWNER", status: "ACTIVE" },
    select: { userId: true },
  });

  let count = 0;
  for (const fu of followUps) {
    for (const owner of owners) {
      await upsertUnreadAlertNotification({
        organizationId,
        userId: owner.userId,
        type: "service.follow_up",
        alertKey: `followup-${fu.id}`,
        title: "Follow-up due",
        body: `${fu.customer.name}${fu.note ? ` — ${fu.note}` : ""}`,
        metadata: { followUpId: fu.id, customerId: fu.customerId },
        href: `/service/customers/${fu.customerId}`,
      });
    }
    count++;
  }
  return { count };
}

export async function syncServiceReminders(organizationId: string) {
  const appointments = await syncAppointmentReminders(organizationId);
  const amc = await syncAmcRenewalReminders(organizationId);
  const followUps = await syncFollowUpReminders(organizationId);
  return {
    appointments: appointments.count,
    amc: amc.count,
    followUps: followUps.count,
  };
}
