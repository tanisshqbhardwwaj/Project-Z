import type { ReactNode } from "react";
import { Apple, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navyCta, outlineCta } from "@/components/marketing/cta";
import { SectionEyebrow } from "@/components/marketing/marketing-footer";
import { mk } from "@/components/marketing/marketing-theme";
import type { PublicMarketingConfig } from "@/lib/marketing/public-config";

type DownloadAppsProps = {
  config: PublicMarketingConfig;
  /** Hide section header when embedded in another section (e.g. landing page). */
  embedded?: boolean;
};

export function DownloadApps({ config, embedded }: DownloadAppsProps) {
  return (
    <section
      className="scroll-mt-20 space-y-10"
      aria-labelledby={embedded ? undefined : "downloads-heading"}
      id={embedded ? undefined : "downloads"}
    >
      {!embedded ? (
        <div className="max-w-2xl space-y-4">
          <SectionEyebrow>GET THE APP</SectionEyebrow>
          <h2 id="downloads-heading" className={cn("text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl", mk.heading)}>
            Same login on every device.
          </h2>
          <p className={cn("text-base leading-relaxed sm:text-lg", mk.body)}>
            Android works offline after the first sync. Windows desktop is available now. iOS and Mac
            are on the way.
          </p>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <DownloadTile
          icon={<Smartphone className="h-5 w-5" />}
          label="Download APK"
          href={config.androidApkUrl}
          downloadName={config.androidApkDownloadName}
          emphasis
        />
        <DownloadTile
          icon={<Monitor className="h-5 w-5" />}
          label="Download for Windows"
          href={config.windowsDownloadUrl}
          downloadName={config.windowsDownloadName}
        />
        <DownloadTile icon={<Smartphone className="h-5 w-5" />} label="iOS · Coming soon" />
        <DownloadTile icon={<Apple className="h-5 w-5" />} label="Mac · Coming soon" />
      </div>
      {!config.androidApkUrl || !config.windowsDownloadUrl ? (
        <p className={cn("text-sm sm:text-base", mk.muted)}>
          Missing an installer? Ask us for the Android APK or Windows build.
        </p>
      ) : null}
    </section>
  );
}

function DownloadTile({
  icon,
  label,
  href,
  downloadName,
  emphasis,
}: {
  icon: ReactNode;
  label: string;
  href?: string | null;
  downloadName?: string;
  emphasis?: boolean;
}) {
  const className = cn(
    "inline-flex h-auto min-h-12 w-full items-center justify-start gap-3 rounded-2xl px-6 py-4 text-left text-sm font-medium sm:text-base",
    href && emphasis ? navyCta : outlineCta,
    !href && "cursor-not-allowed opacity-70"
  );

  if (href) {
    return (
      <Button asChild className={className}>
        <a href={href} download={downloadName ?? true} className="inline-flex w-full items-center gap-3">
          <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>
          <span>{label}</span>
        </a>
      </Button>
    );
  }

  return (
    <Button disabled className={className} title={emphasis ? "Ask us for the installer" : undefined}>
      <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>
      <span>{label}</span>
    </Button>
  );
}
