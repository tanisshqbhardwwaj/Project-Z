"use client";

import { useEffect, useState } from "react";

/** Shows Ctrl+K on Windows/Linux and ⌘K on macOS */
export function SearchShortcutKeys({ className }: { className?: string }) {
  const [mac, setMac] = useState(false);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/i.test(navigator.userAgent));
  }, []);

  return (
    <kbd className={className} aria-label={mac ? "Command K" : "Control K"}>
      {mac ? "⌘K" : "Ctrl+K"}
    </kbd>
  );
}
