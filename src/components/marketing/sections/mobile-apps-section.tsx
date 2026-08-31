import type { PublicMarketingConfig } from "@/lib/marketing/public-config";
import { DownloadApps } from "@/components/marketing/download-apps";
import { SectionShell } from "@/components/marketing/shared/section-shell";
import { mk } from "@/components/marketing/marketing-theme";
type MobileAppsSectionProps = {
  config: PublicMarketingConfig;
};

export function MobileAppsSection({ config }: MobileAppsSectionProps) {
  return (
    <SectionShell
      id="downloads"
      eyebrow="MOBILE & DESKTOP"
      title="BusinessOS on Android & Windows"
      description="Download BusinessOS by E-console — your shop POS and business tools on Android and Windows. Android works offline after the first sync. iOS is coming soon."
      className={mk.sectionAlt}
    >
      <div className="mt-8">
        <DownloadApps config={config} embedded />
      </div>
    </SectionShell>
  );
}
