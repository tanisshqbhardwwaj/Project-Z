import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";
import { clearActiveOrgCookie } from "@/lib/org/active-org-cookie";

export async function POST() {
  await clearActiveOrgCookie();
  await signOut({ redirect: false });
  return NextResponse.json({ data: { ok: true } });
}
