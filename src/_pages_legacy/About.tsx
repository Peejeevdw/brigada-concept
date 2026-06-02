import Appear from "@/components/Appear";
import RevealText from "@/components/RevealText";
import ScrollPhysicsGroup from "@/components/ScrollPhysicsGroup";
import ParallaxBanner from "@/components/home-v4-v2/ParallaxBanner";
import bannerImage from "@/assets/home-banner.jpg";
import aboutTeam from "@/assets/about/about-team.jpg";
import aboutCraft from "@/assets/about/about-craft.jpg";
import aboutStudio from "@/assets/about/about-studio.jpg";
import evaImg from "@/assets/team/eva.jpg";
import lukasImg from "@/assets/team/lukas.jpg";
import marieImg from "@/assets/team/marie.jpg";
import tomImg from "@/assets/team/tom.jpg";

const leads = [
  { label: "Brand", name: "Eva", role: "Brand Lead", image: evaImg, email: "eva@brigada.be", phone: "+00 000 00 00" },
  { label: "Product", name: "Lukas", role: "Product Lead", image: lukasImg, email: "lukas@brigada.be", phone: "+00 000 00 00" },
  { label: "People", name: "Marie", role: "People Lead", image: marieImg, email: "marie@brigada.be", phone: "+00 000 00 00" },
  { label: "Marketing", name: "Tom", role: "Marketing Lead", image: tomImg, email: "tom@brigada.be", phone: "+00 000 00 00" },
];

const sections: { title: string; copy: [string, string] }[] = [
  {
    title: "THE FIGHT WE PICKED",
    copy: [
      "We want to get brands and people moving again. Not by pushing every button at once, but by pushing for a clear direction.",
      "Because real progress comes from radical focus. From asking difficult questions and stripping away the unnecessary. We don't aim for 'louder'; we aim for sharper.",
    ],
  },
  {
    title: "STRONG HERITAGE",
    copy: [
      "We're building on the legacy and strong expertise of Fantastic, meetmarcel, mortierbrigade, Onlyhumans, Today and Who Owns The Zebra.",
      "That's a lot of knowhow right there, and a lot of great work that's been rewarded with several Effies, XXX and XXX.",
    ],
  },
  {
    title: "THE SHARPEST TOOLS IN THE SHED",
    copy: [
      "Coincidentally, we also live by the SHARP model: Strategic, Human, Authentic, Relevant, Provocative.",
      "It's the lens we use to challenge briefs, test ideas and make sure our work pulls its weight. Feel free to use it on us, too.",
    ],
  },
  {
    title: "AN AGENCY FOR THE FUTURE",
    copy: [
      "We combine the service of an integrated agency with the expertise of all the different specialist agencies you'd otherwise need, and need to keep aligned.",
      "We see strategy as the foundation for every decision. And we're creative, without losing sight of your business reality. In short: we tick quite a few boxes.",
    ],
  },
];

const About = () => {
  return (
    <article className="bg-[#f3f2ef]" style={{ color: "#2D2928" }}>
      {/* HERO */}
      <section className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 pt-6 md:pt-10">
        <div className="relative w-full aspect-[8/3] flex flex-col items-center justify-center text-center">
          <Appear from="up" delay={60}>
            <p className="font-nav" style={{ color: "#2D2928" }}>REPEAT AFTER US</p>
          </Appear>
          <Appear from="up" delay={140}>
            <h2 className="font-hero mt-3 md:mt-4" style={{ color: "#2D2928" }}>SHARP BEATS LOUD</h2>
          </Appear>
          <Appear from="up" delay={240}>
            <p className="font-meta mt-4 md:mt-5 mx-auto max-w-xl" style={{ color: "#2D2928" }}>
              Brigada was born when Fantastic, meetmarcel, mortierbrigade, Onlyhumans, Today and Who Owns The Zebra joined forces to kick brands into gear. We move as one, without the hand-offs that slow most agencies down.
            </p>
          </Appear>
        </div>
      </section>

      <div className="pt-8 md:pt-12" />

      <div className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96">
        <hr className="border-0 border-t border-[#2D2928] m-0" />
      </div>

      <ScrollPhysicsGroup>
        {sections.map((s, i) => (
          <div key={s.title}>
            {i > 0 && (
              <div className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 ws-2">
                <hr className="border-0 border-t border-[#2D2928] m-0" />
              </div>
            )}
            <section className={`px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 ${i === 0 ? "pt-10" : "pt-10 md:pt-12"}`}>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 md:gap-5 items-start">
                <div className="md:col-span-2">
                  <p className="font-title">{s.title}</p>
                </div>
                <div className="md:col-span-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 font-body text-left">
                    <RevealText as="p" text={s.copy[0]} stagger={18} duration={650} />
                    <RevealText as="p" text={s.copy[1]} stagger={18} duration={650} />
                  </div>
                </div>
              </div>
            </section>
          </div>
        ))}

        {/* SINGLE IMAGE */}
        <section className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 ws-2">
          <img
            src={aboutTeam}
            alt="Brigada at work"
            className="w-full h-[calc(100vh-4.5rem-var(--ws-0))] md:h-[calc(100vh-4.5rem-var(--ws-0-md))] object-cover"
          />
        </section>

        {/* TWO-UP IMAGES */}
        <section className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 ws-0">
          <div className="grid grid-cols-6 gap-3 md:gap-5">
            <img
              src={aboutCraft}
              alt="Brigada studio 1"
              className="col-span-2 w-full aspect-video object-cover"
            />
            <img
              src={aboutStudio}
              alt="Brigada studio 2"
              className="col-span-4 w-full aspect-square object-cover"
            />
          </div>
        </section>

        <div className="ws-2" />

        {/* TALK TO EXPERTISE LEADS */}
        <div className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96">
          <hr className="border-0 border-t border-[#2D2928] m-0 mb-8 md:mb-10" />
        </div>

        <section className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 pb-10 md:pb-14 text-center">
          <Appear from="up" delay={60}>
            <p className="font-nav">SO HOW ABOUT IT?</p>
          </Appear>
          <Appear from="up" delay={140}>
            <h2 className="font-hero mt-3 md:mt-4">LET'S TALK</h2>
          </Appear>
        </section>

        <section className="font-body px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 pb-24">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-x-3 md:gap-x-5 gap-y-12 items-start">
            {leads.map((p, i) => (
              <div key={p.label} className={i === 0 ? "md:col-span-1 md:col-start-2" : "md:col-span-1"}>
                <div className="aspect-[4/5] overflow-hidden w-full">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover grayscale"
                  />
                </div>
                <p className="font-nav mt-4">{p.label}</p>
                <div className="font-meta mt-4 text-left">
                  <p>{p.name}</p>
                  <p>{p.role}</p>
                  <p>{p.email}</p>
                  <p>{p.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </ScrollPhysicsGroup>

      <ParallaxBanner src={bannerImage} alt="Brigada at work" />
    </article>
  );
};

export default About;
