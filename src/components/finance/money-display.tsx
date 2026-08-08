import { formatINR } from "@/lib/finance/money";
import { cn } from "@/lib/utils";

interface MoneyDisplayProps {
  paise: bigint | string | number;
  className?: string;
  showSign?: boolean;
}

export function MoneyDisplay({ paise, className, showSign }: MoneyDisplayProps) {
  const value = typeof paise === "bigint" ? paise : BigInt(paise);
  const formatted = formatINR(value);
  const isNegative = value < BigInt(0);

  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        isNegative && "text-destructive",
        className
      )}
    >
      {showSign && isNegative ? formatted : formatted}
    </span>
  );
}
