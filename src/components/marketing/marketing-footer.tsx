import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm space-y-2">
          <p className="text-sm font-semibold tracking-wide text-slate-950">PROJECT Z</p>
          <p className="text-sm leading-relaxed text-slate-600">
            Professional digital billing and business management — start with invoicing, grow into
            inventory, expenses, and projects.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-600">
          <Link href="/#billing" className="hover:text-slate-950">
            Features
          </Link>
          <Link href="/pricing" className="hover:text-slate-950">
            Pricing
          </Link>
          <Link href="/pricing/compare" className="hover:text-slate-950">
            Compare plans
          </Link>
          <Link href="/#faq" className="hover:text-slate-950">
            FAQ
          </Link>
          <Link href="/#downloads" className="hover:text-slate-950">
            Get the app
          </Link>
          <Link href="/login" className="hover:text-slate-950">
            Log In
          </Link>
          <Link href="/register" className="font-medium text-slate-950 hover:underline">
            Create account
          </Link>
        </div>
      </div>
      <div className="border-t border-slate-200 bg-[#f6f7fb]">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Project Z. All rights reserved.</span>
          <span>GST-ready · Offline Android · Web & Windows</span>
        </div>
      </div>
    </footer>
  );
}

export function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">{children}</p>
  );
}
