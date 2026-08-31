import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { mk } from "@/components/marketing/marketing-theme";

const TRANSFORMATIONS = [
  { from: "Paper bills", to: "Digital invoices" },
  { from: "Notebook expenses", to: "Digital expense tracking" },
  { from: "Scattered project records", to: "Organized project management" },
] as const;

export function DigitalTransformationSection() {
  return (
    <section
      className={cn(
        "scroll-mt-20 border-b bg-slate-950 text-white",
        "dark:border-slate-800 dark:bg-slate-900"
      )}
    >
      <div className={cn(mk.container, mk.sectionPad)}>
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">GO DIGITAL</p>
        <h2 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          Move Your Business From Paper to Digital.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
          Replace handwritten bills, scattered expense notes, and disconnected records with one
          organized digital system.
        </p>
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {TRANSFORMATIONS.map(({ from, to }) => (
            <div
              key={from}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center dark:border-slate-700 dark:bg-slate-950/60"
            >
              <p className="text-sm font-medium text-slate-400 sm:text-base">{from}</p>
              <ArrowDown className="mx-auto my-4 h-5 w-5 text-emerald-400" aria-hidden />
              <p className="text-base font-semibold text-white sm:text-lg">{to}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
