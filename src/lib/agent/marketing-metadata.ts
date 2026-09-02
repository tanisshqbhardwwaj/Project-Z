import type { Metadata } from "next";
import {
  COMPANY_NAME,
  DEFAULT_PRODUCTION_APP_URL,
  ECONSOLE_LOGO_PATH,
  PRODUCT_BY_COMPANY,
} from "@/lib/brand/constants";

export const marketingMetadataBase = new URL(DEFAULT_PRODUCTION_APP_URL);

export const sharedMarketingOpenGraph: NonNullable<Metadata["openGraph"]> = {
  type: "website",
  siteName: COMPANY_NAME,
  images: [
    {
      url: ECONSOLE_LOGO_PATH,
      width: 1200,
      height: 630,
      alt: `${PRODUCT_BY_COMPANY} — econsole.in`,
    },
  ],
};

export function marketingPageMetadata(options: {
  title: string;
  description: string;
  path: string;
  markdownPath?: string;
}): Metadata {
  const canonicalPath = options.path === "/" ? "/" : options.path;
  const markdownAlternate = options.markdownPath ?? `${canonicalPath === "/" ? "/index" : canonicalPath}.md`;

  return {
    title: options.title,
    description: options.description,
    alternates: {
      canonical: canonicalPath,
      types: {
        "text/markdown": markdownAlternate,
      },
    },
    openGraph: {
      ...sharedMarketingOpenGraph,
      title: options.title,
      description: options.description,
      url: canonicalPath,
    },
  };
}
