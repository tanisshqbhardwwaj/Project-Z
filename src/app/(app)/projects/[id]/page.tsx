"use client";

import { Suspense } from "react";
import { PageLoader } from "@/components/ui/page-loader";
import ProjectDetailContent from "./project-detail-content";

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading project..." />}>
      <ProjectDetailContent />
    </Suspense>
  );
}
