"use client";

import { type ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ScrollToTop from "@/components/ScrollToTop";
import WorkTransitionOverlay from "@/components/WorkTransitionOverlay";
import ServicesTransitionOverlay from "@/components/ServicesTransitionOverlay";
import SiteGridOverlay from "@/components/SiteGridOverlay";
import ReviewComments from "@/components/review/ReviewComments";
import PageTransitionProvider from "@/components/PageTransition";
import PillarChrome from "@/components/site/PillarChrome";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ScrollToTop />
        <WorkTransitionOverlay />
        <ServicesTransitionOverlay />
        <SiteGridOverlay />
        <ReviewComments />
        <PageTransitionProvider>{children}</PageTransitionProvider>
        {/* Service-pillar chrome (SiteNav + tabs) — mounted OUTSIDE the crossfade
            so the nav and tab bar stay steady while only the content beneath
            fades between pillars. Self-gates to /brand · /marketing · /people ·
            /product. */}
        <PillarChrome />
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
