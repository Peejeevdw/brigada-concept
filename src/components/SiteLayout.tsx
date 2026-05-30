import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Footer from "./Footer";

const SiteLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#f3f2ef] text-neutral-900">
      <main className="flex-1 min-h-screen">
        <Suspense fallback={<div className="min-h-screen" />}>
          <Outlet />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
};

export default SiteLayout;
