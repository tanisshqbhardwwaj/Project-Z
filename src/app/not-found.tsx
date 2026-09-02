import Link from "next/link";
import { NOT_FOUND_MARKDOWN } from "@/lib/agent/not-found-content";
import { DEFAULT_PRODUCTION_APP_URL, PRODUCT_BY_COMPANY } from "@/lib/brand/constants";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
        Page not found
      </h1>
      <p className="mt-3 text-slate-600 dark:text-slate-400">
        This path does not exist on{" "}
        <a href={DEFAULT_PRODUCTION_APP_URL} className="text-blue-700 underline">
          econsole.in
        </a>
        . {PRODUCT_BY_COMPANY} helps Indian businesses with billing, inventory, and staff.
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-slate-700 dark:text-slate-300">
        <li>
          <Link href="/llms.txt" className="text-blue-700 underline">
            llms.txt
          </Link>{" "}
          — agent documentation index
        </li>
        <li>
          <Link href="/sitemap.xml" className="text-blue-700 underline">
            Sitemap
          </Link>{" "}
          — public pages
        </li>
        <li>
          <Link href="/" className="text-blue-700 underline">
            Home
          </Link>
        </li>
        <li>
          <Link href="/pricing" className="text-blue-700 underline">
            Pricing
          </Link>
        </li>
      </ul>
      {/* Hidden markdown mirror for agents that scrape rendered HTML */}
      <pre className="sr-only" aria-hidden="true">
        {NOT_FOUND_MARKDOWN}
      </pre>
    </div>
  );
}
