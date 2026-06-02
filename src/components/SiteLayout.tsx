import type { ReactNode } from "react";
import Footer from "./Footer";

const SiteLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#f3f2ef] text-neutral-900">
      <main className="flex-1 min-h-screen">{children}</main>
      <Footer />
    </div>
  );
};

export default SiteLayout;
