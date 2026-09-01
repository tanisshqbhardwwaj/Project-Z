import { auth } from "@/lib/auth";
import { handleApi, apiSuccess, ApiError } from "@/lib/api/context";
import { acceptInvite } from "@/services/organization.service";
import { serializeBigInt } from "@/lib/db/prisma";
import { MAX_ORGANIZATIONS } from "@/lib/org/constants";
import { prisma } from "@/lib/db/prisma";
import {
  classifyInviteToken,
  INVITE_STATUS_MESSAGES,
  isPlaceholderInviteEmail,
} from "@/lib/org/org-invites";
import { isShopVertical } from "@/lib/org/business-type";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  return handleApi(async () => {
    const session = await auth();
    if (!session?.user?.id) {
      throw new ApiError(401, "UNAUTHORIZED", "Please log in to accept this invitation");
    }

    const { token } = await params;

    const count = await prisma.organizationMember.count({
      where: { userId: session.user.id, status: "ACTIVE" },
    });
    const pendingInvite = await prisma.organizationInvite.findUnique({
      where: { token },
      select: { organizationId: true },
    });
    const alreadyInInvitedOrg = pendingInvite
      ? await prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: pendingInvite.organizationId,
              userId: session.user.id,
            },
          },
          select: { status: true },
        })
      : null;
    if (count >= MAX_ORGANIZATIONS && alreadyInInvitedOrg?.status !== "ACTIVE") {
      throw new ApiError(
        409,
        "ORG_LIMIT",
        `You can belong to at most ${MAX_ORGANIZATIONS} organizations`
      );
    }

    const result = await acceptInvite(token, session.user.id);
    return apiSuccess(serializeBigInt(result));
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  return handleApi(async () => {
    const { token } = await params;
    const invite = await prisma.organizationInvite.findUnique({
      where: { token },
      include: {
        organization: { select: { name: true, businessType: true } },
      },
    });

    const session = await auth();
    const status = classifyInviteToken(invite);

    if (status === "already_accepted" && invite && session?.user?.id) {
      const member = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: invite.organizationId,
            userId: session.user.id,
          },
        },
        select: { status: true, role: true },
      });
      if (member?.status === "ACTIVE") {
        return apiSuccess({
          email: isPlaceholderInviteEmail(invite.email) ? null : invite.email,
          organizationName: invite.organization.name,
          organizationId: invite.organizationId,
          role: member.role,
          purpose: invite.role === "CASHIER" ? "staff_login" : "org_team",
          isShop: isShopVertical(invite.organization.businessType),
          alreadyMember: true,
        });
      }
    }

    if (status !== "ok" || !invite) {
      const info = INVITE_STATUS_MESSAGES[status === "ok" ? "not_found" : status];
      throw new ApiError(info.status, info.code, info.message);
    }

    const staffMatch = invite.email
      ? await prisma.staffMember.findFirst({
          where: {
            organizationId: invite.organizationId,
            email: invite.email.toLowerCase(),
            status: "ACTIVE",
          },
          select: { id: true },
        })
      : null;

    return apiSuccess({
      email: isPlaceholderInviteEmail(invite.email) ? null : invite.email,
      organizationName: invite.organization.name,
      organizationId: invite.organizationId,
      role: invite.role,
      purpose:
        invite.role === "CASHIER" || staffMatch ? "staff_login" : "org_team",
      isShop: isShopVertical(invite.organization.businessType),
      alreadyMember: false,
    });
  });
}
