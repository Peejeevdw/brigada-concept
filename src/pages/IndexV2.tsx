import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Nav from "@/components/Nav";
import Hero from "@/components/home-v4-v2/Hero";
import ScrollUnderline from "@/components/ScrollUnderline";
import Appear from "@/components/Appear";
import RevealChildren from "@/components/RevealChildren";


import SectionTitle from "@/components/home-v4-v2/SectionTitle";
import PillarCasesCarousel from "@/components/PillarCasesCarousel";
import HorizontalCases from "@/components/home-v4-v2/HorizontalCases";
import { projects as allProjects } from "@/data/projects";
import ReasonsToBelieve from "@/components/home-v4-v2/ReasonsToBelieve";
import Footer from "@/components/Footer";
import BrigadaLoader from "@/components/BrigadaLoader";
import ParallaxBanner from "@/components/home-v4-v2/ParallaxBanner";
import bannerImage from "@/assets/home-banner.jpg";

const IndexV2 = () => {
  return (
    <div className="v4-root min-h-screen overflow-x-clip bg-[#f3f2ef]" style={{ color: "#2D2928" }}>
      <style>{`
        .v4-root .text-neutral-900 { color: #2D2928 !important; }
        .v4-root .text-neutral-700 { color: rgba(31,27,22,0.78) !important; }
        .v4-root .text-neutral-500 { color: rgba(31,27,22,0.55) !important; }
        .v4-root .text-neutral-400 { color: rgba(31,27,22,0.40) !important; }
      `}</style>
      <Hero />
      <Nav variant="solid" showLogo />
      <div className="relative">
        <div className="relative">
          <section className="sticky top-0 z-0 flex items-center px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 bg-[#f3f2ef]" style={{ height: "100vh" }}>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 md:gap-5 items-start w-full">
              <div className="md:col-span-4 md:col-start-2 font-body text-center flex flex-col gap-4 md:gap-6">
                <RevealChildren as="span" className="font-big-title">
                  We cut through the noise to set brands in motion across everything they do.
                </RevealChildren>

              </div>



            </div>
          </section>


          <div className="relative z-50">

            <HorizontalCases
              count={4}
              projects={["tui", "bmw", "agristo", "politie"]
                .map((slug) => allProjects.find((p) => p.slug === slug))
                .filter((p): p is typeof allProjects[number] => Boolean(p))}
            />
          </div>
        </div>



        <section className="min-h-screen flex items-center ws-2">
          <ReasonsToBelieve />
        </section>

        <ParallaxBanner src={bannerImage} alt="Brigada at work" />

        <Footer />
      </div>
    </div>
  );
};

export default IndexV2;
