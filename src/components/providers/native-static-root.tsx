"use client";

import { NextIntlClientProvider } from "next-intl";
import { Providers } from "@/components/providers";
import messages from "../../../messages/en.json";

export function NativeStaticRoot({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <NextIntlClientProvider locale="en" messages={messages}>
        {children}
      </NextIntlClientProvider>
    </Providers>
  );
}
