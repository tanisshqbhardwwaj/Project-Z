import {
  COMPANY_NAME,
  COMPANY_TAGLINE,
  DEFAULT_CONTACT_EMAIL,
  DEFAULT_PRODUCTION_APP_URL,
  ECONSOLE_LOGO_PATH,
  PRODUCT_BY_COMPANY,
  PRODUCT_NAME,
  PRODUCT_SUBTITLE,
  PRODUCT_TAGLINE,
} from "@/lib/brand/constants";

export function buildMarketingJsonLd() {
  const baseUrl = DEFAULT_PRODUCTION_APP_URL;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: COMPANY_NAME,
        alternateName: ["econsole.in", PRODUCT_NAME],
        url: baseUrl,
        logo: `${baseUrl}${ECONSOLE_LOGO_PATH}`,
        email: DEFAULT_CONTACT_EMAIL,
        description: `${COMPANY_NAME} — ${COMPANY_TAGLINE}. Maker of ${PRODUCT_NAME}, an all-in-one business management platform for Indian businesses.`,
        sameAs: [],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${baseUrl}/#software`,
        name: PRODUCT_NAME,
        alternateName: PRODUCT_BY_COMPANY,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, Android, Windows",
        description: `${PRODUCT_SUBTITLE}. ${PRODUCT_TAGLINE} Billing, inventory, staff, and projects for Indian businesses.`,
        url: baseUrl,
        author: { "@id": `${baseUrl}/#organization` },
        offers: {
          "@type": "Offer",
          url: `${baseUrl}/pricing`,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
        },
      },
    ],
  };
}
