import { MoneyDisplay } from "./money-display";
import type { LedgerEntry } from "@/lib/finance/vendor-ledger";

interface LedgerTableProps {
  entries: LedgerEntry[];
}

export function LedgerTable({ entries }: LedgerTableProps) {
  if (entries.length === 0) {
    return <p className="text-muted-foreground py-8 text-center">No ledger entries yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-base">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-3 pr-4 font-medium">Date</th>
            <th className="pb-3 pr-4 font-medium">Description</th>
            <th className="pb-3 pr-4 text-right font-medium">Bill</th>
            <th className="pb-3 pr-4 text-right font-medium">Payment</th>
            <th className="pb-3 text-right font-medium">Balance</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i} className="border-b border-border/50">
              <td className="py-3 pr-4">{entry.date.toLocaleDateString("en-IN")}</td>
              <td className="py-3 pr-4">{entry.description}</td>
              <td className="py-3 pr-4 text-right">
                {entry.billPaise > BigInt(0) ? <MoneyDisplay paise={entry.billPaise} /> : "—"}
              </td>
              <td className="py-3 pr-4 text-right">
                {entry.paymentPaise > BigInt(0) ? <MoneyDisplay paise={entry.paymentPaise} /> : "—"}
              </td>
              <td className="py-3 text-right">
                <MoneyDisplay paise={entry.balancePaise} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
