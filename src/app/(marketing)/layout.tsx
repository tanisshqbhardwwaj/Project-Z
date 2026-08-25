import Link from "next/link";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navyCta } from "@/components/marketing/cta";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7fb] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
          <AppLogo href="/" variant="compact" onLight />
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <Link href="/" className="hover:text-slate-950">
              Home
            </Link>
            <Link href="/#about" className="hover:text-slate-950">
              About
            </Link>
            <Link href="/pricing" className="hover:text-slate-950">
              Pricing
            </Link>
            <Link href="/pricing#contact" className="hover:text-slate-950">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden text-slate-700 sm:inline-flex">
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild size="sm" className={cn(navyCta, "gap-2")}>
              <Link href="/register">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
