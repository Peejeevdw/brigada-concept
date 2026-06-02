"use client";

import { type ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ScrollToTop from "@/components/ScrollToTop";
import WorkTransitionOverlay from "@/components/WorkTransitionOverlay";
import ExpertiseTransitionOverlay from "@/components/ExpertiseTransitionOverlay";
import SiteGridOverlay from "@/components/SiteGridOverlay";
import ReviewComments from "@/components/review/ReviewComments";
import Nav from "@/components/Nav";
import PageTransitionProvider from "@/components/PageTransition";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ScrollToTop />
        <WorkTransitionOverlay />
        <ExpertiseTransitionOverlay />
        <SiteGridOverlay />
        <ReviewComments />
        <Nav />
        <PageTransitionProvider>{children}</PageTransitionProvider>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
