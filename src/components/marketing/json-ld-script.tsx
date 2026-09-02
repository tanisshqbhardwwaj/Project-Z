import { buildMarketingJsonLd } from "@/lib/agent/json-ld";

export function JsonLdScript() {
  const jsonLd = buildMarketingJsonLd();
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
