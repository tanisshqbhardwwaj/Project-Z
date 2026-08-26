import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApi, apiSuccess } from "@/lib/api/context";
import { requirePlatformAdmin } from "@/lib/billing/platform-admin";
import {
  addBetaTestEmail,
  listBetaTestEmails,
  removeBetaTestEmail,
  MAX_BETA_TEST_EMAILS,
} from "@/services/beta-test-email.service";
import { serializeBigInt } from "@/lib/db/prisma";

const addSchema = z.object({ email: z.string().email() });
const removeSchema = z.object({ email: z.string().email() });

/** Platform admins manage the global beta registration allowlist (max 20). */
export async function GET(request: Request) {
  return handleApi(async () => {
    await requirePlatformAdmin();

    const emails = await listBetaTestEmails();
    return apiSuccess(
      serializeBigInt({
        emails,
        max: MAX_BETA_TEST_EMAILS,
        count: emails.length,
      })
    );
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const admin = await requirePlatformAdmin();

    const body = await request.json();
    const { email } = addSchema.parse(body);

    const entry = await addBetaTestEmail({
      email,
      addedById: admin.userId,
    });

    return NextResponse.json({ data: serializeBigInt(entry) }, { status: 201 });
  });
}

export async function DELETE(request: Request) {
  return handleApi(async () => {
    await requirePlatformAdmin();

    const body = await request.json();
    const { email } = removeSchema.parse(body);

    await removeBetaTestEmail(email);
    return apiSuccess({ removed: email.toLowerCase().trim() });
  });
}
