import { AppLogo } from "@/components/brand/app-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 w-full max-w-md">
        <AppLogo href="/" variant="full" className="mx-auto w-full" />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
