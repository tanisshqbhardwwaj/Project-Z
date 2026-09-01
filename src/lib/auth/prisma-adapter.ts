import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser } from "@auth/core/adapters";
import { prisma } from "@/lib/db/prisma";

/** Auth.js expects `emailVerified`; our schema uses `emailVerifiedAt`. */
function toAdapterUser(user: {
  id: string;
  email: string;
  name: string;
  emailVerifiedAt: Date | null;
}): AdapterUser {
  const { emailVerifiedAt, ...rest } = user;
  return {
    ...rest,
    emailVerified: emailVerifiedAt,
  } as AdapterUser;
}

function oauthUserToDb(data: unknown) {
  const record = data as Record<string, unknown>;
  const { emailVerified, image: _image, ...rest } = record;
  const email = typeof rest.email === "string" ? rest.email : "";
  const name =
    typeof rest.name === "string" && rest.name.trim()
      ? rest.name.trim()
      : email.split("@")[0] || "User";

  return {
    ...rest,
    name,
    ...(emailVerified != null ? { emailVerifiedAt: emailVerified } : {}),
  };
}

export function projectPrismaAdapter(): Adapter {
  const base = PrismaAdapter(prisma);

  return {
    ...base,
    createUser: async (data) => {
      const user = await prisma.user.create({
        data: oauthUserToDb(data) as never,
      });
      return toAdapterUser(user);
    },
    updateUser: async ({ id, ...data }) => {
      const user = await prisma.user.update({
        where: { id },
        data: oauthUserToDb(data) as never,
      });
      return toAdapterUser(user);
    },
    getUser: async (id) => {
      const user = await prisma.user.findUnique({ where: { id } });
      return user ? toAdapterUser(user) : null;
    },
    getUserByEmail: async (email) => {
      const user = await prisma.user.findUnique({ where: { email } });
      return user ? toAdapterUser(user) : null;
    },
    async getUserByAccount(provider_providerAccountId) {
      const account = await prisma.account.findUnique({
        where: { provider_providerAccountId },
        include: { user: true },
      });
      return account?.user ? toAdapterUser(account.user) : null;
    },
  };
}
