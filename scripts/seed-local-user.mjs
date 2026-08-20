/**
 * Seed a verified local user into SQLite so login works without Turso/Resend.
 *
 * Usage:
 *   $env:DATABASE_URL="file:./dev.db"
 *   node scripts/seed-local-user.mjs
 *
 * Optional:
 *   $env:SEED_EMAIL="you@email.com"
 *   $env:SEED_PASSWORD="password123"
 *   $env:SEED_NAME="Your Name"
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

const email = (process.env.SEED_EMAIL ?? "tanishqbhardwaj457@gmail.com")
  .trim()
  .toLowerCase();
const password = process.env.SEED_PASSWORD ?? "password123";
const name = process.env.SEED_NAME ?? "Tanishq";

async function main() {
  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    update: {
      passwordHash,
      emailVerifiedAt: new Date(),
      name,
    },
  });

  console.log("✓ Local user ready");
  console.log(`  email:    ${user.email}`);
  console.log(`  password: ${password}`);
  console.log("  Log in at http://localhost:3000/login");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
