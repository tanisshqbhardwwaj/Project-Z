import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mk } from "@/components/marketing/marketing-theme";

export function FinalCtaSection() {
  return (
    <section className="bg-slate-950 text-white dark:border-t dark:border-slate-800 dark:bg-slate-900">
      <div className={cn(mk.container, "flex flex-col items-center gap-8 py-20 text-center lg:py-28")}>
        <h2 className="max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          Ready to Take Your Business Digital?
        </h2>
        <p className="max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
          Start with professional billing today. Add inventory, expenses, projects, and business
          management as you grow.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="h-12 rounded-full bg-white px-8 text-slate-950 hover:bg-slate-100">
            <Link href="/register">
              Create Your First Invoice
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 rounded-full border-slate-600 bg-transparent px-8 text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
