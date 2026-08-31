import Link from "next/link";
import { cn } from "@/lib/utils";
import { EConsoleMark, ProjectZMark } from "@/components/brand/project-z-mark";
import {
  COMPANY_NAME,
  COMPANY_TAGLINE,
  PRODUCT_NAME,
  PRODUCT_SUBTITLE,
} from "@/lib/brand/constants";

/** company = E-console site; product = logged-in app; dual = login/signup handoff */
export type BrandMode = "company" | "product" | "dual";

type AppLogoProps = {
  href?: string | null;
  variant?: "compact" | "full" | "mark";
  className?: string;
  /** Dark wordmark for white/light bars (ignores html dark mode). */
  onLight?: boolean;
  brandMode?: BrandMode;
  /** @deprecated Use brandMode="product" */
  showCompany?: boolean;
  /** @deprecated Use brandMode */
  showCompanyTagline?: boolean;
  /** @deprecated Use brandMode="dual" */
  showProductTagline?: boolean;
};

const markTileClass =
  "relative flex items-center justify-center overflow-hidden rounded-xl bg-white p-0.5 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-950 dark:ring-white/10";

function resolveBrandMode(props: AppLogoProps): BrandMode {
  if (props.brandMode) return props.brandMode;
  if (props.showCompany === false) return "company";
  if (props.showProductTagline) return "dual";
  return "product";
}

function CompanyWordmark({
  onLight = false,
  size = "compact",
}: {
  onLight?: boolean;
  size?: "compact" | "full";
}) {
  const muted = onLight ? "text-slate-500" : "text-muted-foreground";
  const titleClass =
    size === "full"
      ? "text-xl font-semibold tracking-tight text-slate-950"
      : cn("text-base font-semibold tracking-tight", onLight ? "text-slate-950" : "text-foreground");

  return (
    <span className="shrink-0 leading-none">
      <span className={cn("block", titleClass)}>{COMPANY_NAME}</span>
      <span
        className={cn(
          "mt-0.5 block font-medium",
          size === "full" ? "text-sm" : "text-[11px] leading-snug",
          muted
        )}
      >
        {COMPANY_TAGLINE}
      </span>
    </span>
  );
}

function ProductWordmark({
  showCompany = true,
  showCompanyTagline = true,
  showProductTagline = false,
  onLight = false,
  size = "compact",
}: {
  showCompany?: boolean;
  showCompanyTagline?: boolean;
  showProductTagline?: boolean;
  onLight?: boolean;
  size?: "compact" | "full";
}) {
  const muted = onLight ? "text-slate-500" : "text-muted-foreground";
  const productBase = PRODUCT_NAME.endsWith("OS") ? PRODUCT_NAME.slice(0, -2) : PRODUCT_NAME;
  const productSuffix = PRODUCT_NAME.endsWith("OS") ? "OS" : "";
  const titleClass =
    size === "full"
      ? "text-xl font-extrabold tracking-tight"
      : "text-[15px] font-extrabold tracking-tight";
  const productBaseClass = onLight ? "text-slate-950" : "text-slate-950 dark:text-white";

  return (
    <span className="shrink-0 leading-none">
      <span className={cn("block", titleClass)}>
        <span className={productBaseClass}>{productBase}</span>
        <span className="text-[#2563eb]">{productSuffix}</span>
      </span>
      {showCompany ? (
        <span className={cn("mt-0.5 block font-medium tracking-wide", size === "full" ? "text-sm" : "text-[10px]", muted)}>
          by {COMPANY_NAME}
        </span>
      ) : null}
      {showCompanyTagline ? (
        <span
          className={cn(
            "mt-0.5 block max-w-[11rem] font-medium leading-snug",
            size === "full" ? "text-sm" : "text-[9px]",
            muted
          )}
        >
          {COMPANY_TAGLINE}
        </span>
      ) : null}
      {showProductTagline ? (
        <>
          <ProductTagline size={size} onLight={onLight} />
          {size === "full" ? (
            <span className={cn("mt-1 block text-xs font-medium", muted)}>{PRODUCT_SUBTITLE}</span>
          ) : null}
        </>
      ) : null}
    </span>
  );
}

function ProductTagline({ size, onLight = false }: { size: "compact" | "full"; onLight?: boolean }) {
  const textClass = onLight ? "text-slate-700" : "text-slate-700 dark:text-slate-300";
  return (
    <span
      className={cn(
        "mt-1 flex items-center justify-center gap-1.5 font-medium",
        size === "full" ? "text-xs" : "text-[10px]",
        textClass
      )}
    >
      <span>Manage.</span>
      <span className="h-1 w-1 rounded-full bg-[#2563eb]" aria-hidden />
      <span>Automate.</span>
      <span className="h-1 w-1 rounded-full bg-[#10b981]" aria-hidden />
      <span>Grow.</span>
    </span>
  );
}

function DualAuthWordmark({ onLight = false }: { onLight?: boolean }) {
  const muted = onLight ? "text-slate-500" : "text-muted-foreground";
  const productBase = PRODUCT_NAME.endsWith("OS") ? PRODUCT_NAME.slice(0, -2) : PRODUCT_NAME;
  const productSuffix = PRODUCT_NAME.endsWith("OS") ? "OS" : "";
  const titleClass = onLight ? "text-slate-950" : "text-foreground";

  return (
    <span className="shrink-0 space-y-2 leading-snug">
      <span className="block text-2xl font-extrabold tracking-tight sm:text-3xl">
        <span className={titleClass}>{productBase}</span>
        <span className="text-[#2563eb]">{productSuffix}</span>
      </span>
      <ProductTagline size="full" onLight={onLight} />
      <span className={cn("block text-sm font-medium", muted)}>by {COMPANY_NAME}</span>
    </span>
  );
}

function DualWordmark({ onLight = false, size = "compact" }: { onLight?: boolean; size?: "compact" | "full" }) {
  if (size === "full") {
    return <DualAuthWordmark onLight={onLight} />;
  }
  return (
    <ProductWordmark
      showCompany
      showCompanyTagline={false}
      showProductTagline
      onLight={onLight}
      size={size}
    />
  );
}

export function AppLogo({
  href = "/dashboard",
  variant = "compact",
  className,
  onLight = false,
  brandMode: brandModeProp,
  showCompany,
  showCompanyTagline,
  showProductTagline,
}: AppLogoProps) {
  const brandMode = resolveBrandMode({
    brandMode: brandModeProp,
    showCompany,
    showCompanyTagline,
    showProductTagline,
  });
  const size = variant === "full" ? "full" : "compact";
  const Mark = brandMode === "company" ? EConsoleMark : ProjectZMark;

  const wordmark =
    brandMode === "company" ? (
      <CompanyWordmark onLight={onLight} size={size} />
    ) : brandMode === "dual" ? (
      <DualWordmark onLight={onLight} size={size} />
    ) : (
      <ProductWordmark
        showCompany
        showCompanyTagline={showCompanyTagline !== false}
        showProductTagline={false}
        onLight={onLight}
        size={size}
      />
    );

  const content =
    variant === "full" ? (
      <div
        className={cn(
          "overflow-hidden rounded-2xl bg-card px-8 py-8 text-card-foreground shadow-lg ring-1 ring-border",
          className
        )}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          {brandMode === "company" ? (
            <>
              <EConsoleMark className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" />
              <CompanyWordmark onLight={onLight} size={size} />
            </>
          ) : (
            <>
              <ProjectZMark className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" />
              {brandMode === "dual" ? (
                <DualAuthWordmark onLight={onLight} />
              ) : (
                <ProductWordmark
                  showCompany
                  showCompanyTagline={showCompanyTagline !== false}
                  showProductTagline={false}
                  onLight={onLight}
                  size={size}
                />
              )}
            </>
          )}
        </div>
      </div>
    ) : variant === "mark" ? (
      <span className={cn(markTileClass, "h-10 w-10", className)}>
        <Mark className="relative h-full w-full" />
      </span>
    ) : (
      <span className={cn("inline-flex items-center gap-3", className)}>
        <span className={cn(markTileClass, "h-11 w-11 shrink-0")}>
          <Mark className="relative h-full w-full" />
        </span>
        {wordmark}
      </span>
    );

  const wrapperClass = cn("inline-flex shrink-0 items-center", className);

  if (href) {
    return (
      <Link href={href} className={cn(wrapperClass, "transition-opacity hover:opacity-90")}>
        {content}
      </Link>
    );
  }

  return <span className={wrapperClass}>{content}</span>;
}

export const APP_SHELL_HEADER_HEIGHT = "h-16";
