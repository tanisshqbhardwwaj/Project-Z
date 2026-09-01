import { AppLogo } from "@/components/brand/app-logo";
import { AppearanceMenu } from "@/components/theme/appearance-menu";
import { COMPANY_TAGLINE, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col lg:grid lg:grid-cols-2">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6 lg:left-auto lg:right-6">
        <AppearanceMenu />
      </div>

      <div className="relative hidden flex-col justify-center border-r bg-gradient-to-br from-primary/5 via-background to-primary/10 p-10 lg:flex xl:p-14">
        <div className="mx-auto w-full max-w-md space-y-8">
          <AppLogo href="/" variant="full" brandMode="dual" className="w-full" />
          <div className="space-y-3">
            <p className="text-lg font-semibold text-foreground">{COMPANY_TAGLINE}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Sign in to {PRODUCT_NAME} — {PRODUCT_TAGLINE.toLowerCase()} Billing, inventory,
              expenses, and projects in one place.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-background p-4 sm:p-6 lg:p-10">
        <div className="mb-8 w-full max-w-md lg:hidden">
          <AppLogo href="/" variant="full" brandMode="dual" className="mx-auto w-full" />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
