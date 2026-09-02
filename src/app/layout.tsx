import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/providers";
import { ThemeScript } from "@/components/theme/theme-script";
import { NativeStaticRoot } from "@/components/providers/native-static-root";
import "./globals.css";

const isNativeShellBuild = process.env.NEXT_PUBLIC_NATIVE_SHELL === "1";

const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "BusinessOS — Billing, inventory & business management",
  description:
    "BusinessOS by E-console — Powering Digital Possibilities. Billing, inventory, staff, and projects for Indian businesses. Manage. Automate. Grow.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "BusinessOS",
    statusBarStyle: "default",
  },
  applicationName: "BusinessOS",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1222" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (isNativeShellBuild) {
    return (
      <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
        <body className="min-h-full antialiased">
          <ThemeScript />
          <NativeStaticRoot>{children}</NativeStaticRoot>
        </body>
      </html>
    );
  }

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <ThemeScript />
        <Providers>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
