"use client";

import { useFetch } from "@/hooks/use-fetch";
import { apiFetch } from "@/lib/api/client";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ProjectOption = { id: string; name: string; nickname?: string | null };

type ProjectSelectProps = {
  value: string;
  onChange: (projectId: string) => void;
  className?: string;
};

export function ProjectSelect({ value, onChange, className }: ProjectSelectProps) {
  const { data: projects, loading } = useFetch("projects", () =>
    apiFetch<ProjectOption[]>("/api/v1/projects")
  );

  return (
    <div className={cn("space-y-2", className)}>
      <Label>Project</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm"
        disabled={loading}
      >
        <option value="">
          {loading ? "Loading projects..." : "Select project..."}
        </option>
        {(projects ?? []).map((p) => (
          <option key={p.id} value={p.id}>
            {p.nickname?.trim() || p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
