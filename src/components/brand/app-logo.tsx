import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ProjectZMark } from "@/components/brand/project-z-mark";

type AppLogoProps = {
  href?: string | null;
  variant?: "compact" | "full" | "mark";
  className?: string;
};

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
          "overflow-hidden rounded-2xl bg-[#050505] px-8 py-6 shadow-lg ring-1 ring-black/10",
          className
        )}
      >
        <Image
          src="/logo.png"
          alt="Project Z — Manage every project. From A to Z."
          width={1024}
          height={682}
          className="h-auto w-full max-w-[300px] object-contain"
          priority
        />
      </div>
    ) : variant === "mark" ? (
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-950 to-slate-900 shadow-sm ring-1 ring-black/5">
        <ProjectZMark className="h-6 w-6" />
      </span>
    ) : (
      <span className={cn("inline-flex items-center gap-2.5", className)}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-950 to-slate-900 shadow-sm ring-1 ring-black/5">
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
