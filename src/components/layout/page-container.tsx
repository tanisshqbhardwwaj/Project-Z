import { cn } from "@/lib/utils";

type PageContainerWidth = "narrow" | "content" | "wide" | "full";

const widthClasses: Record<PageContainerWidth, string> = {
  narrow: "max-w-2xl",
  content: "max-w-5xl",
  wide: "max-w-7xl 2xl:max-w-[1600px]",
  full: "",
};

export function PageContainer({
  children,
  width = "content",
  className,
}: {
  children: React.ReactNode;
  width?: PageContainerWidth;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full min-w-0", widthClasses[width], className)}>
      {children}
    </div>
  );
}
