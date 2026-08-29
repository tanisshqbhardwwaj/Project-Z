import type { PublicMarketingConfig } from "@/lib/marketing/public-config";
import { DownloadApps } from "@/components/marketing/download-apps";
import { SectionShell } from "@/components/marketing/shared/section-shell";

type MobileAppsSectionProps = {
  config: PublicMarketingConfig;
};

export function MobileAppsSection({ config }: MobileAppsSectionProps) {
  return (
    <SectionShell
      id="downloads"
      eyebrow="MOBILE & DESKTOP"
      title="Manage Your Business From Anywhere"
      description="Access your business on Android, Windows, and the web. Android works offline after the first sync. iOS is coming soon."
      className="bg-[#f6f7fb]"
    >
      <div className="mt-8">
        <DownloadApps config={config} embedded />
      </div>
    </SectionShell>
  );
}
