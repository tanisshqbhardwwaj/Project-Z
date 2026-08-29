import { ArrowDown } from "lucide-react";
import { SectionShell } from "@/components/marketing/shared/section-shell";

const TRANSFORMATIONS = [
  { from: "Paper bills", to: "Digital invoices" },
  { from: "Notebook expenses", to: "Digital expense tracking" },
  { from: "Scattered project records", to: "Organized project management" },
] as const;

export function DigitalTransformationSection() {
  return (
    <section className="scroll-mt-20 border-b border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 lg:py-20">
        <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">GO DIGITAL</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          Move Your Business From Paper to Digital.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
          Replace handwritten bills, scattered expense notes, and disconnected records with one
          organized digital system.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {TRANSFORMATIONS.map(({ from, to }) => (
            <div
              key={from}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-center"
            >
              <p className="text-sm font-medium text-slate-400">{from}</p>
              <ArrowDown className="mx-auto my-3 h-5 w-5 text-emerald-400" aria-hidden />
              <p className="text-base font-semibold text-white">{to}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
