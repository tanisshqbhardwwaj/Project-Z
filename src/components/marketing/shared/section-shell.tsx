import { cn } from "@/lib/utils";
import { SectionEyebrow } from "@/components/marketing/marketing-footer";

type SectionShellProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  headingClassName?: string;
  centered?: boolean;
};

export function SectionShell({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
  innerClassName,
  headingClassName,
  centered = false,
}: SectionShellProps) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-20 border-b border-slate-200", className)}
    >
      <div className={cn("mx-auto w-full max-w-6xl px-4 py-16 lg:py-20", innerClassName)}>
        <div className={cn("space-y-4", centered && "mx-auto max-w-2xl text-center")}>
          {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
          <h2
            className={cn(
              "text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl",
              headingClassName
            )}
          >
            {title}
          </h2>
          {description ? (
            <p className="max-w-2xl text-base leading-relaxed text-slate-600">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}
