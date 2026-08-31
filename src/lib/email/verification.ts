import { prisma } from "@/lib/db/prisma";
import { sendEmail, verificationEmailHtml } from "@/lib/email";
import { PRODUCT_NAME } from "@/lib/brand/constants";
import { getPublicAppUrl } from "@/lib/app/public-url";
import { generateToken } from "@/lib/utils";

export async function createVerificationTokenAndSendEmail(
  user: {
    email: string;
    name: string;
  },
  options?: { clientIp?: string }
) {
  await prisma.verificationToken.deleteMany({
    where: { identifier: user.email },
  });

  const token = generateToken(48);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.verificationToken.create({
    data: { identifier: user.email, token, expires },
  });

  const verifyUrl = `${getPublicAppUrl()}/verify-email?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: `Verify your email - ${PRODUCT_NAME}`,
    html: verificationEmailHtml(user.name, verifyUrl),
    devLink: verifyUrl,
    clientIp: options?.clientIp,
  });

  return { verifyUrl };
}
