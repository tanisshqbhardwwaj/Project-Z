import { Suspense } from "react";
import { PageLoader } from "@/components/ui/page-loader";
import OnboardingContent from "./onboarding-content";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading..." />}>
      <OnboardingContent />
    </Suspense>
  );
}
