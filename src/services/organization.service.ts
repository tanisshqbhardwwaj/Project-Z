import { prisma } from "@/lib/db/prisma";
import { slugify, generateToken } from "@/lib/utils";
import { seedExpenseCategories } from "../../prisma/categories";
import { sendEmail, inviteEmailHtml } from "@/lib/email";
import { createAuditLog } from "./audit.service";
import type { OrgRole } from "@prisma/client";

export async function createOrganization(input: {
  name: string;
  userId: string;
}) {
  let slug = slugify(input.name);
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const org = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.name,
        slug,
      },
    });

    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: input.userId,
        role: "OWNER",
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });

    return organization;
  });

  await seedExpenseCategories(prisma, org.id);

  await createAuditLog({
    organizationId: org.id,
    userId: input.userId,
    action: "organization.created",
    entityType: "Organization",
    entityId: org.id,
    after: org,
  });

  return org;
}

export async function createInviteLink(input: {
  organizationId: string;
  email?: string;
  role: OrgRole;
  invitedById: string;
}) {
  const token = generateToken(48);
  const invite = await prisma.organizationInvite.create({
    data: {
      organizationId: input.organizationId,
      email: (input.email ?? `invite-${token}@placeholder.local`).toLowerCase(),
      role: input.role,
      token,
      invitedById: input.invitedById,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    include: { organization: true },
  });

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;
  return { invite, url };
}

export async function inviteMember(input: {
  organizationId: string;
  email: string;
  role: OrgRole;
  invitedById: string;
}) {
  const { invite, url } = await createInviteLink(input);

  await sendEmail({
    to: input.email,
    subject: `Invitation to join ${invite.organization.name}`,
    html: inviteEmailHtml(invite.organization.name, url),
  });

  return invite;
}

export async function acceptInvite(token: string, userId: string) {
  const invite = await prisma.organizationInvite.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw new Error("Invalid or expired invitation");
  }

  const member = await prisma.$transaction(async (tx) => {
    await tx.organizationInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    return tx.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId,
        },
      },
      create: {
        organizationId: invite.organizationId,
        userId,
        role: invite.role,
        status: "ACTIVE",
        invitedAt: invite.createdAt,
        joinedAt: new Date(),
      },
      update: {
        role: invite.role,
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });
  });

  return { member, organization: invite.organization };
}

export async function getOrganizationMembers(organizationId: string) {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId, status: "ACTIVE" },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { joinedAt: "asc" },
  });

  if (members.length === 0) return [];

  const projectMemberships = await prisma.projectMember.findMany({
    where: {
      userId: { in: members.map((m) => m.userId) },
      project: { organizationId, deletedAt: null },
    },
    select: {
      userId: true,
      project: { select: { id: true, name: true, nickname: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const projectsByUser = new Map<string, Array<{ id: string; name: string }>>();
  for (const membership of projectMemberships) {
    const list = projectsByUser.get(membership.userId) ?? [];
    list.push({
      id: membership.project.id,
      name: membership.project.nickname?.trim() || membership.project.name,
    });
    projectsByUser.set(membership.userId, list);
  }

  return members.map((member) => {
    const partnerProjects = projectsByUser.get(member.userId) ?? [];
    return {
      ...member,
      partnerProjectCount: partnerProjects.length,
      partnerProjects,
    };
  });
}
