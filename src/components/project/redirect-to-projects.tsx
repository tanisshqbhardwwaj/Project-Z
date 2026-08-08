"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Redirect org-level module pages to work order list — data lives under /projects/[id]. */
export function RedirectToProjects() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  useEffect(() => {
    if (projectId) {
      router.replace(`/projects/${projectId}`);
    } else {
      router.replace("/projects");
    }
  }, [router, projectId]);

  return (
    <div className="py-12 text-center text-muted-foreground">
      Select a work order to continue…
    </div>
  );
}
