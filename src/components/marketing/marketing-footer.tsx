import Link from "next/link";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/brand/app-logo";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand/constants";
import { mk } from "@/components/marketing/marketing-theme";

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#billing", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/pricing/compare", label: "Compare plans" },
      { href: "/#downloads", label: "Get the app" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/#faq", label: "FAQ" },
      { href: "/#projects", label: "Projects" },
      { href: "/#billing", label: "Billing & invoices" },
      { href: "/llms.txt", label: "llms.txt" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/register", label: "Create account" },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className={cn("mt-auto border-t", mk.sectionBorder, mk.sectionBase)}>
      <div className={cn(mk.container, "grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4")}>
        <div className="space-y-4 sm:col-span-2 lg:col-span-1">
          <AppLogo href="/" brandMode="company" variant="compact" />
          <p className={cn("text-sm leading-relaxed sm:text-base", mk.body)}>
            Our product{" "}
            <span className={cn("font-semibold", mk.heading)}>{PRODUCT_NAME}</span> powers billing,
            inventory, expenses, and projects. {PRODUCT_TAGLINE}
          </p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title} className="space-y-3">
            <p className={cn("text-sm font-semibold", mk.heading)}>{column.title}</p>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={cn("text-sm", mk.link)}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={cn("border-t", mk.sectionBorder, mk.sectionAlt)}>
        <div
          className={cn(
            mk.container,
            "flex flex-col gap-2 py-6 text-xs sm:flex-row sm:justify-between",
            mk.muted
          )}
        >
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
