import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { projectPrismaAdapter } from "@/lib/auth/prisma-adapter";
import { hash, verify } from "@node-rs/argon2";
import { prisma } from "@/lib/db/prisma";
import { ensureUserSchema } from "@/lib/db/ensure-user-schema";
import { readActiveOrgCookie, clearActiveOrgCookie } from "@/lib/org/active-org-cookie";
import {
  createMfaPendingToken,
  decryptTotpSecret,
  isTotpEnabled,
  verifyMfaPendingToken,
  verifyTotpCode,
} from "@/lib/auth/totp";

export const TOTP_REQUIRED_PREFIX = "TOTP_REQUIRED:";

const authSecret = process.env.AUTH_SECRET?.trim();
const googleClientId =
  process.env.AUTH_GOOGLE_ID?.trim() ?? process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret =
  process.env.AUTH_GOOGLE_SECRET?.trim() ?? process.env.GOOGLE_CLIENT_SECRET?.trim();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: projectPrismaAdapter(),
  secret: authSecret,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            allowDangerousEmailAccountLinking: true,
            authorization: {
              params: {
                prompt: "select_account",
              },
            },
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaToken: { label: "MFA Token", type: "text" },
        totpCode: { label: "TOTP Code", type: "text" },
      },
      async authorize(credentials) {
        await ensureUserSchema();

        if (credentials?.mfaToken && credentials?.totpCode) {
          const userId = verifyMfaPendingToken(credentials.mfaToken as string);
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (!user?.totpSecretEnc || !user.totpEnabledAt) {
            throw new Error("TOTP_NOT_ENABLED");
          }
          const secret = decryptTotpSecret(user.totpSecretEnc);
          if (!verifyTotpCode(secret, credentials.totpCode as string)) {
            throw new Error("INVALID_TOTP");
          }

          await prisma.$executeRawUnsafe(
            `UPDATE "User" SET "lastLoginAt" = ? WHERE "id" = ?`,
            new Date().toISOString(),
            user.id
          ).catch(() => {});

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        }

        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) {
          throw new Error("USER_NOT_FOUND");
        }

        const valid = await verify(user.passwordHash, credentials.password as string);
        if (!valid) {
          throw new Error("INVALID_PASSWORD");
        }

        if (!user.emailVerifiedAt && !isTotpEnabled(user)) {
          if (user.totpSecretEnc && !user.totpEnabledAt) {
            throw new Error("TOTP_SETUP_INCOMPLETE");
          }
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        if (isTotpEnabled(user)) {
          throw new Error(`${TOTP_REQUIRED_PREFIX}${createMfaPendingToken(user.id)}`);
        }

        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET "lastLoginAt" = ? WHERE "id" = ?`,
          new Date().toISOString(),
          user.id
        ).catch(() => {});

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async signIn() {
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        const cookieId = await readActiveOrgCookie();
        const cookieMember = cookieId
          ? await prisma.organizationMember.findUnique({
              where: {
                organizationId_userId: {
                  organizationId: cookieId,
                  userId: user.id!,
                },
              },
              select: { status: true },
            })
          : null;
        if (cookieMember?.status === "ACTIVE") {
          token.activeOrganizationId = cookieId;
        } else {
          const membership = await prisma.organizationMember.findFirst({
            where: { userId: user.id!, status: "ACTIVE" },
            orderBy: { joinedAt: "asc" },
          });
          token.activeOrganizationId = membership?.organizationId ?? null;
        }
      }
      if (trigger === "update" && session?.activeOrganizationId) {
        token.activeOrganizationId = session.activeOrganizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.activeOrganizationId = token.activeOrganizationId as string | null;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      await ensureUserSchema();
      await prisma.user
        .update({
          where: { id: user.id },
          data: { emailVerifiedAt: new Date() },
        })
        .catch(() => {});
    },
    async signIn({ user, account }) {
      if (!user.id) return;
      await ensureUserSchema();
      await prisma.user
        .update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            ...(account?.provider === "google" ? { emailVerifiedAt: new Date() } : {}),
          },
        })
        .catch(() => {});
    },
    async signOut() {
      await clearActiveOrgCookie();
    },
  },
});

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

export async function verifyPassword(
  passwordHash: string,
  password: string
): Promise<boolean> {
  return verify(passwordHash, password);
}
