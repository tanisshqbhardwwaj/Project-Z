import Link from "next/link";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/brand/app-logo";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand/constants";
import { mk } from "@/components/marketing/marketing-theme";
export function MarketingFooter() {
  return (
    <footer className={cn("mt-auto border-t", mk.sectionBorder, mk.sectionBase)}>
      <div className={cn(mk.container, "flex flex-col gap-10 py-14 sm:flex-row sm:items-start sm:justify-between")}>
        <div className="max-w-md space-y-4">
          <AppLogo href="/" brandMode="company" variant="compact" />
          <p className={cn("text-sm leading-relaxed sm:text-base", mk.body)}>            Our product <span className={cn("font-semibold", mk.heading)}>{PRODUCT_NAME}</span> powers
            billing, inventory, expenses, and projects. {PRODUCT_TAGLINE}
          </p>
        </div>
        <div className={cn("flex flex-wrap gap-x-8 gap-y-3 text-sm", mk.body)}>
          <Link href="/#billing" className={mk.link}>
            Features
          </Link>
          <Link href="/pricing" className={mk.link}>
            Pricing
          </Link>
          <Link href="/pricing/compare" className={mk.link}>
            Compare plans
          </Link>
          <Link href="/#faq" className={mk.link}>
            FAQ
          </Link>
          <Link href="/#downloads" className={mk.link}>
            Get the app
          </Link>
          <Link href="/login" className={mk.link}>
            Log In
          </Link>
          <Link href="/register" className={cn("font-medium", mk.heading, "hover:underline")}>
            Create account
          </Link>
        </div>
      </div>
      <div className={cn("border-t", mk.sectionBorder, mk.sectionAlt)}>
        <div className={cn(mk.container, "flex flex-col gap-2 py-6 text-xs sm:flex-row sm:justify-between", mk.muted)}>
          <span>© {new Date().getFullYear()} E-console. All rights reserved.</span>
          <span>GST-ready · Offline Android · Web & Windows</span>
        </div>
      </div>
    </footer>
  );
}

export function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className={cn("text-xs font-semibold tracking-[0.18em]", mk.muted)}>{children}</p>
  );
}
