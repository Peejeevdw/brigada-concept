import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
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
const ConceptLab = lazy(() => import("./pages/ConceptLab"));
const Brand = lazy(() => import("./pages/Brand"));
const CareersV2 = lazy(() => import("./pages/CareersV2"));
const AboutV2 = lazy(() => import("./pages/AboutV2"));
const EmployerBranding = lazy(() => import("./pages/EmployerBranding"));
const BrandV2 = lazy(() => import("./pages/BrandV2"));
const WaveTest = lazy(() => import("./pages/WaveTest"));
const SharpBeats = lazy(() => import("./pages/SharpBeats"));
const Brio = lazy(() => import("./pages/Brio"));
const ExpertiseV2 = lazy(() => import("./pages/ExpertiseV2"));
const Product = lazy(() => import("./pages/Product"));
const People = lazy(() => import("./pages/People"));
const Marketing = lazy(() => import("./pages/Marketing"));
const WorkV2 = lazy(() => import("./pages/WorkV2"));
const ContactV2 = lazy(() => import("./pages/ContactV2"));

const queryClient = new QueryClient();
const HIDE_NAV_ROUTES = ["/", "/fantastic", "/wotz", "/today", "/mortierbrigade", "/onlyhumans", "/concept-lab", "/brand", "/careers-v2", "/about-v2", "/employer-branding", "/brand-v2", "/wave-test", "/sharp-beats", "/brio", "/expertise-v2", "/product", "/people", "/marketing", "/work-v2", "/contact-v2"];
const ConditionalNav = () => {
  const { pathname } = useLocation();
  // Normalise a trailing slash so e.g. "/brand-v2/" still matches "/brand-v2".
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (HIDE_NAV_ROUTES.includes(path)) return null;
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
            <Route path="/" element={<Concept />} />
            <Route path="/font" element={<Font />} />
            <Route path="/wotz" element={<Wotz />} />
            <Route path="/fantastic" element={<Fantastic />} />
            <Route path="/onlyhumans" element={<Onlyhumans />} />
            <Route path="/mortierbrigade" element={<Mortierbrigade />} />
            <Route path="/today" element={<Today />} />
            <Route path="/animation" element={<Animation />} />
            <Route path="/styles" element={<Styles />} />
            <Route path="/concept" element={<Navigate to="/" replace />} />
            <Route path="/concept-lab" element={<ConceptLab />} />
            <Route path="/brand" element={<Brand />} />
            <Route path="/careers-v2" element={<CareersV2 />} />
            <Route path="/about-v2" element={<AboutV2 />} />
            <Route path="/employer-branding" element={<EmployerBranding />} />
            <Route path="/brand-v2" element={<BrandV2 />} />
            <Route path="/wave-test" element={<WaveTest />} />
            <Route path="/sharp-beats" element={<SharpBeats />} />
            <Route path="/brio" element={<Brio />} />
            <Route path="/expertise-v2" element={<ExpertiseV2 />} />
            <Route path="/product" element={<Product />} />
            <Route path="/people" element={<People />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/work-v2" element={<WorkV2 />} />
            <Route path="/contact-v2" element={<ContactV2 />} />
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
