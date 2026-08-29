import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/marketing/landing-page";
import { auth } from "@/lib/auth";
import { getPublicMarketingConfig } from "@/lib/marketing/public-config";

export const metadata: Metadata = {
  title: "Project Z — Professional Billing & Business Management",
  description:
    "Create professional digital invoices, manage customers and sales, track inventory and expenses, and grow your business — from billing to complete business management.",
};

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const config = getPublicMarketingConfig();

  return <LandingPage config={config} />;
}
