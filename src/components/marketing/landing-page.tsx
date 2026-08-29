import type { PublicMarketingConfig } from "@/lib/marketing/public-config";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { HeroSection } from "@/components/marketing/sections/hero-section";
import { BillingFeaturesSection } from "@/components/marketing/sections/billing-features-section";
import { OperationsFlowSection } from "@/components/marketing/sections/operations-flow-section";
import { ProjectsSection } from "@/components/marketing/sections/projects-section";
import { ExpensesSection } from "@/components/marketing/sections/expenses-section";
import { IndustriesSection } from "@/components/marketing/sections/industries-section";
import { DigitalTransformationSection } from "@/components/marketing/sections/digital-transformation-section";
import { GrowthSection } from "@/components/marketing/sections/growth-section";
import { MobileAppsSection } from "@/components/marketing/sections/mobile-apps-section";
import { PricingSection } from "@/components/marketing/sections/pricing-section";
import { AddonServicesSection } from "@/components/marketing/sections/addon-services-section";
import { TrustSection } from "@/components/marketing/sections/trust-section";
import { FaqSection } from "@/components/marketing/sections/faq-section";
import { FinalCtaSection } from "@/components/marketing/sections/final-cta-section";

type LandingPageProps = {
  config: PublicMarketingConfig;
};

export function LandingPage({ config }: LandingPageProps) {
  return (
    <>
      <HeroSection />
      <BillingFeaturesSection />
      <OperationsFlowSection />
      <ProjectsSection />
      <ExpensesSection />
      <IndustriesSection />
      <DigitalTransformationSection />
      <GrowthSection />
      <MobileAppsSection config={config} />
      <PricingSection />
      <AddonServicesSection />
      <TrustSection />
      <FaqSection />
      <FinalCtaSection />
      <MarketingFooter />
    </>
  );
}
