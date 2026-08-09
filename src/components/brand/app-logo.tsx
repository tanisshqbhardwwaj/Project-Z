import Link from "next/link";
import { cn } from "@/lib/utils";
import { ProjectZMark } from "@/components/brand/project-z-mark";

type AppLogoProps = {
  href?: string | null;
  variant?: "compact" | "full" | "mark";
  className?: string;
};

const markTileClass =
  "flex items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-primary/15";

function BrandWordmark({ showTagline = false }: { showTagline?: boolean }) {
  return (
    <span className="leading-none">
      <span className="block text-[15px] font-semibold tracking-tight text-foreground">
        Project{" "}
        <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
          Z
        </span>
      </span>
      {showTagline ? (
        <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">
          From A to Z
        </span>
      ) : null}
    </span>
  );
}

export function AppLogo({ href = "/dashboard", variant = "compact", className }: AppLogoProps) {
  const content =
    variant === "full" ? (
      <div
        className={cn(
          "overflow-hidden rounded-2xl bg-white px-8 py-8 shadow-lg ring-1 ring-border",
          className
        )}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <span className={cn(markTileClass, "h-20 w-20")}>
            <ProjectZMark className="h-14 w-14" />
          </span>
          <span className="text-xl font-semibold tracking-tight text-foreground">
            Project{" "}
            <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
              Z
            </span>
          </span>
          <span className="text-sm text-muted-foreground">Manage every project. From A to Z.</span>
        </div>
      </div>
    ) : variant === "mark" ? (
      <span className={cn(markTileClass, "h-10 w-10")}>
        <ProjectZMark className="h-7 w-7" />
      </span>
    ) : (
      <span className={cn("inline-flex items-center gap-2.5", className)}>
        <span className={cn(markTileClass, "h-9 w-9 shrink-0")}>
          <ProjectZMark className="h-6 w-6" />
        </span>
        <BrandWordmark />
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
