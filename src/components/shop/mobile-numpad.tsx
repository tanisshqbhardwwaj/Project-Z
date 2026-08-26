"use client";

import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";

export function MobileNumpad({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  function press(key: string) {
    if (key === "back") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "." && value.includes(".")) return;
    onChange(value + key);
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:hidden">
      {keys.map((key) => (
        <Button
          key={key}
          type="button"
          variant="outline"
          className="h-12 rounded-xl text-lg"
          onClick={() => press(key)}
        >
          {key === "back" ? <Delete className="h-5 w-5" /> : key}
        </Button>
      ))}
    </div>
  );
}
