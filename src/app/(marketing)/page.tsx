import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/marketing/landing-page";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Project Z — From A to Z",
  description:
    "Billing, inventory, staff, and projects in one place for shopkeepers, contractors, architects, and builders.",
};

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
