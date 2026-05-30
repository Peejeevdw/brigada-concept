import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SiteLayout from "./components/SiteLayout";
import ScrollToTop from "./components/ScrollToTop";
import WorkTransitionOverlay from "./components/WorkTransitionOverlay";
import ExpertiseTransitionOverlay from "./components/ExpertiseTransitionOverlay";
import SiteGridOverlay from "./components/SiteGridOverlay";
import ReviewComments from "./components/review/ReviewComments";
import Nav from "./components/Nav";
import PageTransitionProvider from "./components/PageTransition";
import IndexV2 from "./pages/IndexV2.tsx";
import WorkDetail from "./pages/WorkDetail";
import Animation from "./pages/Animation";

const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Work = lazy(() => import("./pages/Work"));
const Expertise = lazy(() => import("./pages/Expertise"));
const ExpertiseDetail = lazy(() => import("./pages/ExpertiseDetail"));

const About = lazy(() => import("./pages/About"));
const Careers = lazy(() => import("./pages/Careers"));
const Jobs = lazy(() => import("./pages/Jobs"));
const JobDetail = lazy(() => import("./pages/JobDetail"));
const Contact = lazy(() => import("./pages/Contact"));
const Font = lazy(() => import("./pages/Font"));
const Wotz = lazy(() => import("./pages/Wotz"));
const Fantastic = lazy(() => import("./pages/Fantastic"));
const Onlyhumans = lazy(() => import("./pages/Onlyhumans"));
const Mortierbrigade = lazy(() => import("./pages/Mortierbrigade"));
const Today = lazy(() => import("./pages/Today"));
const Styles = lazy(() => import("./pages/Styles"));
const Concept = lazy(() => import("./pages/Concept"));
const Brand = lazy(() => import("./pages/Brand"));

const queryClient = new QueryClient();
const HIDE_NAV_ROUTES = ["/fantastic", "/wotz", "/today", "/mortierbrigade", "/onlyhumans", "/concept", "/brand"];
const ConditionalNav = () => {
  const { pathname } = useLocation();
  if (HIDE_NAV_ROUTES.includes(pathname)) return null;
  return <Nav />;
};


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <ScrollToTop />
        <WorkTransitionOverlay />
        <ExpertiseTransitionOverlay />
        <SiteGridOverlay />
        <ReviewComments />
        <ConditionalNav />
        <PageTransitionProvider>
        <Suspense fallback={<div className="min-h-screen bg-[#f3f2ef]" />}>
          <Routes>
            <Route path="/" element={<IndexV2 />} />
            <Route path="/font" element={<Font />} />
            <Route path="/wotz" element={<Wotz />} />
            <Route path="/fantastic" element={<Fantastic />} />
            <Route path="/onlyhumans" element={<Onlyhumans />} />
            <Route path="/mortierbrigade" element={<Mortierbrigade />} />
            <Route path="/today" element={<Today />} />
            <Route path="/animation" element={<Animation />} />
            <Route path="/styles" element={<Styles />} />
            <Route path="/concept" element={<Concept />} />
            <Route path="/brand" element={<Brand />} />
            <Route element={<SiteLayout />}>
              <Route path="/work" element={<Work />} />
              <Route path="/work/:slug" element={<WorkDetail />} />
              <Route path="/expertise" element={<Expertise />} />
              <Route path="/expertise/:slug" element={<ExpertiseDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/careers/jobs" element={<Jobs />} />
              <Route path="/careers/jobs/:slug" element={<JobDetail />} />
              <Route path="/contact" element={<Contact />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </PageTransitionProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
