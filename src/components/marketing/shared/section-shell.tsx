import { cn } from "@/lib/utils";
import { SectionEyebrow } from "@/components/marketing/marketing-footer";
import { mk } from "@/components/marketing/marketing-theme";

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
      className={cn("scroll-mt-20 border-b", mk.sectionBorder, className)}
    >
      <div className={cn(mk.container, mk.sectionPad, innerClassName)}>
        <div className={cn("space-y-5", centered && "mx-auto max-w-3xl text-center")}>
          {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
          <h2
            className={cn(
              "text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl",
              mk.heading,
              headingClassName
            )}
          >
            {title}
          </h2>
          {description ? (
            <p className={cn("max-w-3xl text-base leading-relaxed sm:text-lg", mk.body, centered && "mx-auto")}>
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}
