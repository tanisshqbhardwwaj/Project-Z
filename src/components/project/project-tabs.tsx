import Link from "next/link";
import { cn } from "@/lib/utils";

const PROJECT_TABS = [
  { key: "overview", label: "Overview" },
  { key: "work-order", label: "Work Order" },
  { key: "invoices", label: "Invoices" },
  { key: "expenses", label: "Expenses" },
  { key: "payments", label: "Payments" },
  { key: "vendors", label: "Vendors" },
  { key: "documents", label: "Documents" },
  { key: "reports", label: "Reports" },
  { key: "activity", label: "Activity" },
] as const;

export type ProjectTabKey = (typeof PROJECT_TABS)[number]["key"];

export function ProjectTabs({
  projectId,
  activeTab,
}: {
  projectId: string;
  activeTab: string;
}) {
  return (
    <div className="-mx-4 min-w-0 max-w-full overflow-x-auto px-4 md:-mx-0 md:px-0">
      <div className="flex w-max min-w-full gap-2 border-b pb-2">
        {PROJECT_TABS.map((t) => (
        <Link
          key={t.key}
          href={`/projects/${projectId}?tab=${t.key}`}
          className={cn(
            "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeTab === t.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {t.label}
        </Link>
        ))}
      </div>
    </div>
  );
}

export function isValidProjectTab(tab: string): tab is ProjectTabKey {
  return PROJECT_TABS.some((t) => t.key === tab);
}
