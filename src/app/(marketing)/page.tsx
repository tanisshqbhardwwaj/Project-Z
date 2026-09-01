import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/marketing/landing-page";
import { auth } from "@/lib/auth";
import { getPublicMarketingConfig } from "@/lib/marketing/public-config";

export const metadata: Metadata = {
  title: "E-console — Powering Digital Possibilities",
  description:
    "E-console on econsole.in — Powering Digital Possibilities. Run your business on BusinessOS: billing, inventory, staff, and projects. Manage. Automate. Grow.",
};

export default async function HomePage() {
  if (process.env.NEXT_PUBLIC_NATIVE_SHELL === "1") {
    redirect("/login");
  }

  const session = await auth();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const config = getPublicMarketingConfig();

  return <LandingPage config={config} />;
}
