"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { navyCta } from "@/components/marketing/cta";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/#billing", label: "Features" },
  { href: "/#operations", label: "Operations" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/pricing/compare", label: "Compare" },
  { href: "/#faq", label: "FAQ" },
  { href: "/login", label: "Log In" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <AppLogo href="/" variant="compact" onLight />
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          {LINKS.filter((l) => l.href !== "/login").map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-slate-950">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden text-slate-700 sm:inline-flex">
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild size="sm" className={cn(navyCta, "gap-2 px-4")}>
            <Link href="/register">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
              Get Started
            </Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-slate-200 md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="inset-x-auto inset-y-0 right-0 top-0 max-h-none w-72 rounded-none rounded-l-2xl border-l border-slate-200">
              <SheetTitle>Menu</SheetTitle>
              <nav className="mt-6 flex flex-col gap-1 text-sm font-medium">
                {LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg px-3 py-2.5 text-slate-700 hover:bg-slate-100"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
