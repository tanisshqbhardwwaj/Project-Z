"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Search,
  Receipt,
  FilePlus2,
  FolderKanban,
  Building2,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { useNavGroups } from "@/hooks/use-nav-items";
import { useBusinessType } from "@/hooks/use-business-type";

type PaletteItem = {
  id: string;
  group: string;
  label: string;
  icon: LucideIcon;
  href: string;
};

type RemoteResults = {
  projects: Array<{ id: string; name: string }>;
  vendors: Array<{ id: string; name: string }>;
};

export function CommandPalette() {
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const toggle = useCommandPaletteStore((s) => s.toggle);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:anim-fade-in data-[state=closed]:anim-fade-out" />
        {open && <PaletteContent />}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function PaletteContent() {
  const router = useRouter();
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  const biz = useBusinessType();
  const { core, modules, tools, showProjects } = useNavGroups();

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [results, setResults] = useState<RemoteResults | null>(null);
  const [resultsQuery, setResultsQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const q = query.trim();
  const searching = q !== "" && resultsQuery !== q;

  useEffect(() => {
    if (!q) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults({
          projects: data.data?.projects ?? [],
          vendors: data.data?.vendors ?? [],
        });
      } catch {
        setResults({ projects: [], vendors: [] });
      }
      setResultsQuery(q);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const items = useMemo<PaletteItem[]>(() => {
    const navItems = [...core, ...modules, ...tools];
    const needle = q.toLowerCase();

    const actions: PaletteItem[] = showProjects
      ? [
          {
            id: "action-new-expense",
            group: "Actions",
            label: "New Expense",
            icon: Receipt,
            href: "/expenses/new",
          },
          {
            id: "action-new-work-item",
            group: "Actions",
            label: biz.newWorkItemLabel,
            icon: FilePlus2,
            href: "/work-orders/new",
          },
        ]
      : [];

    const navigate: PaletteItem[] = navItems.map((i) => ({
      id: `nav-${i.key}`,
      group: "Navigate",
      label: i.label,
      icon: i.icon,
      href: i.href,
    }));

    if (!needle) {
      return [...actions, ...navigate];
    }

    const matches = (label: string) => label.toLowerCase().includes(needle);

    const remote: PaletteItem[] = !results
      ? []
      : [
          ...results.projects.map((p) => ({
            id: `project-${p.id}`,
            group: biz.workItemPlural,
            label: p.name,
            icon: FolderKanban,
            href: `/projects/${p.id}`,
          })),
          ...results.vendors.map((v) => ({
            id: `vendor-${v.id}`,
            group: "Vendors",
            label: v.name,
            icon: Building2,
            // Vendors are org-level; detail pages live under a project context.
            href: "/projects",
          })),
        ];

    return [
      ...actions.filter((a) => matches(a.label)),
      ...navigate.filter((n) => matches(n.label)),
      ...remote,
    ];
  }, [q, results, core, modules, tools, showProjects, biz]);

  const safeIndex = Math.min(activeIndex, Math.max(items.length - 1, 0));

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${safeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [safeIndex]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(items.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % Math.max(items.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[safeIndex];
      if (item) go(item.href);
    }
  }

  let lastGroup: string | null = null;

  return (
    <DialogPrimitive.Content
      aria-describedby={undefined}
      className="fixed left-1/2 top-[10%] z-50 flex max-h-[70vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl border bg-popover shadow-e3 data-[state=open]:anim-drop-in data-[state=closed]:anim-drop-out"
    >
      <DialogPrimitive.Title className="sr-only">
        Search and quick actions
      </DialogPrimitive.Title>
      <div className="flex shrink-0 items-center gap-3 border-b px-4">
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={`Search ${biz.workItemPlural.toLowerCase()}, vendors, or jump to…`}
          aria-label="Search"
          className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        {searching && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        )}
      </div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
        {items.length === 0 && !searching && (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">
            {q ? `No results for “${q}”.` : "Nothing to show."}
          </p>
        )}
        {items.map((item, idx) => {
          const Icon = item.icon;
          const header =
            item.group !== lastGroup ? (
              <p
                key={`group-${item.group}`}
                className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:pt-1"
              >
                {item.group}
              </p>
            ) : null;
          lastGroup = item.group;
          return (
            <div key={item.id}>
              {header}
              <button
                type="button"
                data-idx={idx}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => go(item.href)}
                className={cn(
                  "flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm",
                  idx === safeIndex
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </button>
            </div>
          );
        })}
      </div>
      <div className="hidden shrink-0 gap-4 border-t px-4 py-2 text-xs text-muted-foreground sm:flex">
        <span>↑↓ Navigate</span>
        <span>↵ Open</span>
        <span>esc Close</span>
      </div>
    </DialogPrimitive.Content>
  );
}
