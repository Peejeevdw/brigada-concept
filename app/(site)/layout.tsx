import type { ReactNode } from "react";
import SiteLayout from "@/components/SiteLayout";

export default function SiteRouteLayout({ children }: { children: ReactNode }) {
  return <SiteLayout>{children}</SiteLayout>;
}
