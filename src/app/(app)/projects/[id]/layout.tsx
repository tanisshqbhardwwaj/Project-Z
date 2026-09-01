import { nativeStaticParams } from "@/lib/native/static-params";

export function generateStaticParams() {
  return nativeStaticParams();
}

export default function ProjectIdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
