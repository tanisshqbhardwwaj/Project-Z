import { Suspense } from "react";
import { RedirectToProjects } from "@/components/project/redirect-to-projects";

export default function VendorsRedirectPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading…</div>}>
      <RedirectToProjects />
    </Suspense>
  );
}
