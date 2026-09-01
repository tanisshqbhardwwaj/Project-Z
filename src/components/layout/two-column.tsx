import { cn } from "@/lib/utils";

type SideWidth = "360px" | "400px" | "420px";

const gridColsLeft: Record<SideWidth, string> = {
  "360px": "xl:grid-cols-[360px_minmax(0,1fr)]",
  "400px": "xl:grid-cols-[400px_minmax(0,1fr)]",
  "420px": "xl:grid-cols-[420px_minmax(0,1fr)]",
};

const gridColsRight: Record<SideWidth, string> = {
  "360px": "xl:grid-cols-[minmax(0,1fr)_360px]",
  "400px": "xl:grid-cols-[minmax(0,1fr)_400px]",
  "420px": "xl:grid-cols-[minmax(0,1fr)_420px]",
};

type TwoColumnProps = {
  main: React.ReactNode;
  side?: React.ReactNode;
  /** Side rail position on xl+ viewports. Defaults to left. */
  sidePosition?: "left" | "right";
  /** Fixed width for the side rail on xl+. Defaults to 360px. */
  sideWidth?: SideWidth;
  className?: string;
  mainClassName?: string;
  sideClassName?: string;
};

export function TwoColumn({
  main,
  side,
  sidePosition = "left",
  sideWidth = "360px",
  className,
  mainClassName,
  sideClassName,
}: TwoColumnProps) {
  if (!side) {
    return <div className={cn("min-w-0", className, mainClassName)}>{main}</div>;
  }

  const gridCols =
    sidePosition === "left" ? gridColsLeft[sideWidth] : gridColsRight[sideWidth];

  return (
    <div className={cn("grid min-w-0 grid-cols-1 gap-4 xl:gap-6", gridCols, className)}>
      <aside
        className={cn(
          "min-w-0",
          sidePosition === "left" ? "order-2 xl:order-1" : "order-2",
          sideClassName
        )}
      >
        {side}
      </aside>
      <div
        className={cn(
          "min-w-0",
          sidePosition === "left" ? "order-1 xl:order-2" : "order-1",
          mainClassName
        )}
      >
        {main}
      </div>
    </div>
  );
}
