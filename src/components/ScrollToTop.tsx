"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { workTransition } from "@/lib/workTransition";
import { servicesTransition } from "@/lib/servicesTransition";

const ScrollToTop = () => {
  const pathname = usePathname();
  useEffect(() => {
    if (workTransition.get().phase !== "idle") return;
    if (servicesTransition.get().phase !== "idle") return;
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

export default ScrollToTop;
