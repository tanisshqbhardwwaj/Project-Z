import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCtaSection() {
  return (
    <section className="bg-slate-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center lg:py-20">
        <h2 className="max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl">
          Ready to Take Your Business Digital?
        </h2>
        <p className="max-w-lg text-slate-400">
          Start with professional billing today. Add inventory, expenses, projects, and business
          management as you grow.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="h-12 rounded-full bg-white px-6 text-slate-950 hover:bg-slate-100">
            <Link href="/register">
              Create Your First Invoice
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 rounded-full border-slate-600 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
