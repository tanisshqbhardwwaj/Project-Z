"use client";

import Link from "next/link";
import { useState } from "react";
import { useSyncExternalStore } from "react";
import { Menu } from "lucide-react";
import { AppLogo } from "@/components/brand/app-logo";
import { AppearanceMenu } from "@/components/theme/appearance-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { navyCta } from "@/components/marketing/cta";
import { mk } from "@/components/marketing/marketing-theme";
import {
  getThemeServerSnapshot,
  getThemeSnapshot,
  subscribeTheme,
} from "@/lib/theme/theme";

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
  const resolvedTheme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );
  const onLight = resolvedTheme === "light";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95">
      <div className={cn(mk.container, "grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]")}>
        {/* Left — logo */}
        <div className="min-w-0 justify-self-start">
          <AppLogo href="/" variant="compact" onLight={onLight} brandMode="company" />
        </div>

        {/* Center — nav (desktop only) */}
        <nav
          aria-label="Main"
          className="hidden items-center justify-center gap-5 text-sm font-medium text-slate-600 dark:text-slate-300 md:flex md:justify-self-center"
        >
          {LINKS.filter((l) => l.href !== "/login").map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap transition-colors hover:text-slate-950 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right — actions */}
        <div className="col-start-2 flex shrink-0 items-center justify-end gap-2 md:col-start-3 md:justify-self-end">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden h-9 px-3 text-slate-700 dark:text-slate-200 lg:inline-flex"
          >
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild size="sm" className={cn(navyCta, "inline-flex h-9 items-center gap-2 px-4")}>
            <Link href="/register" className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
              <span className="hidden sm:inline">Get Started</span>
              <span className="sm:hidden">Start</span>
            </Link>
          </Button>
          <AppearanceMenu />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 border-slate-200 dark:border-slate-700 md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="inset-x-auto inset-y-0 right-0 top-0 max-h-none w-72 rounded-none rounded-l-2xl border-l border-slate-200 dark:border-slate-800">
              <SheetTitle>Menu</SheetTitle>
              <nav className="mt-6 flex flex-col gap-1 text-sm font-medium">
                {LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg px-3 py-2.5 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
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
