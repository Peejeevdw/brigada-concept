import Nav from "@/components/Nav";
import Hero from "@/components/home-v4/Hero";
import Who from "@/components/home-v4/Who";
import What from "@/components/home-v4/What";
import SectionTitle from "@/components/home-v4/SectionTitle";
import PillarCasesCarousel from "@/components/PillarCasesCarousel";
import { projects as allProjects } from "@/data/projects";
import ReasonsToBelieve from "@/components/home-v4/ReasonsToBelieve";
import AwardsTicker from "@/components/home-v4/AwardsTicker";
import FooterImage from "@/components/home-v4/FooterImage";
import Footer from "@/components/Footer";

const selectedProjects = [
  ...allProjects.filter((p) => p.featured),
  ...allProjects.filter((p) => !p.featured),
];

const Index = () => {
  return (
    <div className="v4-root min-h-screen bg-[#f3f2ef]" style={{ color: "#2D2928" }}>
      <style>{`
        .v4-root .text-neutral-900 { color: #2D2928 !important; }
        .v4-root .text-neutral-700 { color: rgba(31,27,22,0.78) !important; }
        .v4-root .text-neutral-500 { color: rgba(31,27,22,0.55) !important; }
        .v4-root .text-neutral-400 { color: rgba(31,27,22,0.40) !important; }
      `}</style>
      <Nav showLogo />
      <Hero />
      <Who />
      <What />
      <SectionTitle />
      <PillarCasesCarousel projects={selectedProjects} />
      <ReasonsToBelieve />
      {/* <AwardsTicker /> */}
      {/* <FooterImage /> */}
      <Footer />
    </div>
  );
};

export default Index;
