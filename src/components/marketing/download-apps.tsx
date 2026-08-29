import type { ReactNode } from "react";
import { Apple, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navyCta, outlineCta } from "@/components/marketing/cta";
import { SectionEyebrow } from "@/components/marketing/marketing-footer";
import type { PublicMarketingConfig } from "@/lib/marketing/public-config";

type DownloadAppsProps = {
  config: PublicMarketingConfig;
  /** Hide section header when embedded in another section (e.g. landing page). */
  embedded?: boolean;
};

export function DownloadApps({ config, embedded }: DownloadAppsProps) {
  return (
    <section className="scroll-mt-20 space-y-8" aria-labelledby={embedded ? undefined : "downloads-heading"} id={embedded ? undefined : "downloads"}>
      {!embedded ? (
      <div className="max-w-xl space-y-3">
        <SectionEyebrow>GET THE APP</SectionEyebrow>
        <h2 id="downloads-heading" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Same login on every device.
        </h2>
        <p className="text-slate-600">
          Android works offline after the first sync. Windows desktop is available now. iOS and Mac
          are on the way.
        </p>
      </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <DownloadTile
          icon={<Smartphone className="h-4 w-4" />}
          label="Download APK"
          href={config.androidApkUrl}
          emphasis
        />
        <DownloadTile
          icon={<Monitor className="h-4 w-4" />}
          label="Download for Windows"
          href={config.windowsDownloadUrl}
        />
        <DownloadTile icon={<Smartphone className="h-4 w-4" />} label="iOS · Coming soon" />
        <DownloadTile icon={<Apple className="h-4 w-4" />} label="Mac · Coming soon" />
      </div>
      {!config.androidApkUrl || !config.windowsDownloadUrl ? (
        <p className="text-sm text-slate-500">Missing an installer? Ask us for the Android APK or Windows build.</p>
      ) : null}
    </section>
  );
}

function DownloadTile({
  icon,
  label,
  href,
  emphasis,
}: {
  icon: ReactNode;
  label: string;
  href?: string | null;
  emphasis?: boolean;
}) {
  const className = cn(
    "h-auto w-full justify-start rounded-2xl px-5 py-4 text-left font-medium",
    href && emphasis ? navyCta : outlineCta,
    !href && "opacity-70"
  );

  if (href) {
    return (
      <Button asChild className={className}>
        <a href={href} download>
          {icon}
          {label}
        </a>
      </Button>
    );
  }

  return (
    <Button disabled className={className} title={emphasis ? "Ask us for the installer" : undefined}>
      {icon}
      {label}
    </Button>
  );
}
