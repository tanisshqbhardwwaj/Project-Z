import { AppLogo } from "@/components/brand/app-logo";
import { AppearanceMenu } from "@/components/theme/appearance-menu";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <AppearanceMenu />
      </div>
      <div className="mb-8 w-full max-w-md">
        <AppLogo href="/" variant="full" brandMode="dual" className="mx-auto w-full" />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
