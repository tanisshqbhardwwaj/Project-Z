import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";

export async function POST() {
  await signOut({ redirect: false });
  return NextResponse.json({ data: { ok: true } });
}

export async function GET() {
  await signOut({ redirect: false });
  return NextResponse.redirect(
    new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
  );
}
