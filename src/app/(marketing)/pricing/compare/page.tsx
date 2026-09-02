import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PlanComparisonTable } from "@/components/marketing/plan-comparison-table";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { Button } from "@/components/ui/button";
import { outlineCta } from "@/components/marketing/cta";
import { mk } from "@/components/marketing/marketing-theme";
import { marketingPageMetadata } from "@/lib/agent/marketing-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = marketingPageMetadata({
  title: "Compare Plans — E-console",
  description:
    "Full feature comparison for Basic, Starter, Business, and Professional plans. See billing, inventory, staff, expenses, and project features side by side.",
  path: "/pricing/compare",
  markdownPath: "/pricing/compare.md",
});

export default function ComparePlansPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className={cn(mk.container, "pt-16 lg:pt-24")}>
        <Button asChild variant="ghost" size="sm" className={cn("mb-8 -ml-2", mk.link)}>
          <Link href="/pricing">
            <ArrowLeft className="h-4 w-4" />
            Back to pricing
          </Link>
        </Button>
        <PlanComparisonTable />
        <div className="mt-14 flex flex-wrap gap-4 pb-20">
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
