import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlanComparisonTable } from "@/components/marketing/plan-comparison-table";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Button } from "@/components/ui/button";
import { outlineCta } from "@/components/marketing/cta";

export const metadata: Metadata = {
  title: "Compare Plans — Project Z",
  description:
    "Full feature comparison for Basic, Starter, Business, and Professional plans. See billing, inventory, staff, expenses, and project features side by side.",
};

export default function ComparePlansPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 pt-14 lg:pt-20">
        <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2 text-slate-600">
          <Link href="/pricing">
            <ArrowLeft className="h-4 w-4" />
            Back to pricing
          </Link>
        </Button>
        <PlanComparisonTable />
        <div className="mt-12 flex flex-wrap gap-3 pb-16">
          <Button asChild className={outlineCta}>
            <Link href="/pricing">View plan prices</Link>
          </Button>
          <Button asChild className={outlineCta}>
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
