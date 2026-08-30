"use client";

import { useCallback, useRef, useState } from "react";
import { Printer } from "lucide-react";
import type { KotPayload } from "@/lib/shop/kot";

const KOT_PRINT_ROOT_ID = "shop-kot-print-root";

function kotLineLabel(line: KotPayload["lines"][number]): string {
  const parts = [line.name];
  if (line.variantLabel) parts.push(line.variantLabel);
  else if (line.size) parts.push(line.size);
  return parts.join(" · ");
}

export function KotPrintPreview({ kot }: { kot: KotPayload }) {
  const created = new Date(kot.createdAt);
  return (
    <div
      id={KOT_PRINT_ROOT_ID}
      className="mx-auto w-[72mm] bg-white p-3 font-mono text-[11px] leading-snug text-black"
    >
      <p className="text-center text-sm font-bold uppercase tracking-wide">
        Kitchen Order
      </p>
      <p className="mt-1 text-center text-xs">
        KOT #{kot.ticketNo}
        {kot.billNumber ? ` · Bill ${kot.billNumber}` : ""}
      </p>
      {kot.customerName ? (
        <p className="mt-1 text-center text-xs">{kot.customerName}</p>
      ) : null}
      <p className="mt-1 text-center text-[10px] text-neutral-600">
        {created.toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
      <div className="my-2 border-t border-dashed border-neutral-400" />
      <ul className="space-y-2">
        {kot.lines.map((line, idx) => (
          <li key={`${line.name}-${idx}`} className="flex justify-between gap-2">
            <span className="min-w-0 flex-1 font-semibold">{kotLineLabel(line)}</span>
            <span className="shrink-0 font-bold tabular-nums">×{line.qty}</span>
          </li>
        ))}
      </ul>
      <div className="my-2 border-t border-dashed border-neutral-400" />
      <p className="text-center text-[10px] uppercase tracking-wider text-neutral-500">
        --- End of KOT ---
      </p>
    </div>
  );
}

export async function printKotTicket(kot: KotPayload): Promise<void> {
  const source = document.getElementById(KOT_PRINT_ROOT_ID);
  if (!source) {
    throw new Error("KOT preview not mounted");
  }
  const html = source.outerHTML;
  const win = window.open("", "_blank", "width=320,height=640");
  if (!win) throw new Error("Allow pop-ups to print the kitchen ticket");
  win.document.write(`<!DOCTYPE html><html><head><title>KOT ${kot.ticketNo}</title>
    <style>
      body { margin: 0; padding: 8px; font-family: ui-monospace, monospace; }
      @media print { body { padding: 0; } }
    </style>
  </head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  await new Promise<void>((resolve) => {
    win.addEventListener("afterprint", () => resolve(), { once: true });
    window.setTimeout(() => resolve(), 30_000);
    win.print();
  });
  win.close();
}

export function useKotPrint() {
  const [kot, setKot] = useState<KotPayload | null>(null);
  const [printing, setPrinting] = useState(false);
  const pendingRef = useRef<KotPayload | null>(null);

  const queueKotPrint = useCallback((payload: KotPayload | null) => {
    pendingRef.current = payload;
    setKot(payload);
  }, []);

  const printKot = useCallback(async () => {
    const payload = pendingRef.current ?? kot;
    if (!payload) return;
    setPrinting(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await printKotTicket(payload);
    } finally {
      setPrinting(false);
      pendingRef.current = null;
      setKot(null);
    }
  }, [kot]);

  function KotPrintLayer() {
    if (!kot) return null;
    return (
      <>
        <div className="pointer-events-none fixed -left-[9999px] top-0 opacity-0">
          <KotPrintPreview kot={kot} />
        </div>
        {printing ? (
          <div className="print-hidden fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-10 py-8 shadow-xl">
              <Printer className="h-8 w-8 animate-pulse text-primary" />
              <p className="text-base font-semibold">Printing kitchen ticket…</p>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return { queueKotPrint, printKot, KotPrintLayer };
}
