"use client";

import Appear from "@/components/Appear";
import RevealText from "@/components/RevealText";
import ScrollPhysicsGroup from "@/components/ScrollPhysicsGroup";
import ParallaxBanner from "@/components/home-v4-v2/ParallaxBanner";
const bannerImage = "/assets/contact-banner.png";
const evaImg = "/assets/team/eva.jpg";
const lukasImg = "/assets/team/lukas.jpg";
const marieImg = "/assets/team/marie.jpg";
const tomImg = "/assets/team/tom.jpg";
const arjanImg = "/assets/team-real/arjan.webp";
const joostImg = "/assets/team-real/joost.jpg";
const joostVideo = "/team-real/joost-move.mp4";
const sentaImg = "/assets/team-real/senta.jpg";
const evertImg = "/assets/team-real/evert.png";
const antwerpImg = "/assets/locations/antwerp.png";
const brusselsImg = "/assets/locations/brussels.jpg";
const gentImg = "/assets/locations/gent.jpg";

const FOOTER_PHONE = "+32 (0)000 00 00 00";
const FOOTER_PHONE_HREF = "tel:+3200000000000";
const FOOTER_EMAIL = "hello@brigada.be";

const FOOTER_LOCATIONS = [
  { city: "BRIGADA ANTWERP", address: "Molenstraat 54", zip: "2018 Antwerpen", image: antwerpImg },
  { city: "BRIGADA GENT", address: "Amelia Earhartlaan 2 Bus 401", zip: "9051 Gent", image: gentImg },
  { city: "BRIGADA BRUSSELS", address: "Waelhemstraat 77", zip: "1030 Schaarbeek", image: brusselsImg },
];

const MANAGEMENT = [
  { label: "CEO", name: "Arjan Pomper", role: "Chief Executive Officer", image: arjanImg, email: "ceo@brigada.be", phone: "+00 000 00 00" },
  { label: "COO", name: "Evert Vermeire", role: "Chief Operating Officer", image: evertImg, email: "coo@brigada.be", phone: "+00 000 00 00" },
  { label: "CCO", name: "Joost Berends", role: "Chief Creative Officer", image: joostImg, video: joostVideo, email: "cco@brigada.be", phone: "+00 000 00 00" },
  { label: "CSO", name: "Senta Slingerland", role: "Chief Strategy Officer", image: sentaImg, email: "cso@brigada.be", phone: "+00 000 00 00" },
];

const PRACTICE_LEADS = [
  { label: "BRAND", name: "Mathias Delmote", role: "Brand Lead", image: evaImg, email: "mathias@brigada.be", phone: "+00 000 00 00" },
  { label: "PRODUCT", name: "Jeroen De Bock", role: "Product Lead", image: lukasImg, email: "jeroen@brigada.be", phone: "+00 000 00 00" },
  { label: "PEOPLE", name: "Bartel Van Iseghem", role: "People Lead", image: marieImg, email: "bartel@brigada.be", phone: "+00 000 00 00" },
  { label: "MARKETING", name: "Dennis Nicholls", role: "Marketing Lead", image: tomImg, email: "dennis@brigada.be", phone: "+00 000 00 00" },
];

const Contact = () => {
  return (
    <article className="bg-[#f3f2ef]" style={{ color: "#2D2928" }}>
      {/* HERO */}
      <section className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 pt-6 md:pt-10">
        <div className="relative w-full aspect-[8/3] flex flex-col items-center justify-center text-center">
          <Appear from="up" delay={60}>
            <p className="font-nav" style={{ color: "#2D2928" }}>COME ON</p>
          </Appear>
          <Appear from="up" delay={140}>
            <h2 className="font-hero mt-3 md:mt-4" style={{ color: "#2D2928" }}>GET IN TOUCH</h2>
          </Appear>
          <Appear from="up" delay={240}>
            <p className="font-meta mt-4 md:mt-5 mx-auto max-w-xl" style={{ color: "#2D2928" }}>
              Fill out the form or email us, and we'll get back to you within two working days. You can also call us, or swing by one of our offices. In any case, we're most useful when you involve us early on.
            </p>
          </Appear>
        </div>
      </section>

      <div className="pt-8 md:pt-12" />

      <div className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96">
        <hr className="border-0 border-t" style={{ borderColor: "#2D2928" }} />
      </div>

      <ScrollPhysicsGroup>
        {/* FORM */}
        <section className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 pt-10">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 md:gap-5 items-start">
            <div className="md:col-span-2">
              <p className="font-title">HI THERE</p>
            </div>
            <div className="md:col-span-4">
              <form className="grid grid-cols-1 md:grid-cols-2 gap-x-3 md:gap-x-5 gap-y-8">
                {[
                  { label: "NAME", span: 1 },
                  { label: "COMPANY", span: 1 },
                  { label: "EMAIL", span: 1 },
                  { label: "PHONE", span: 1 },
                  { label: "PROJECT", span: 2 },
                  { label: "MESSAGE", span: 2, tall: true },
                ].map((f) => (
                  <div
                    key={f.label}
                    className={f.span === 2 ? "md:col-span-2" : "md:col-span-1"}
                  >
                    <label className="font-nav block mb-2">{f.label}</label>
                    <div
                      className={
                        f.tall
                          ? "h-32 border-b border-[#2D2928]"
                          : "h-10 border-b border-[#2D2928]"
                      }
                    />
                  </div>
                ))}
                <div className="md:col-span-2 flex justify-end">
                  <button type="button" className="font-nav link-cta">
                    SEND
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>



        {/* MANAGEMENT */}
        <div className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 ws-2">
          <hr className="border-0 border-t" style={{ borderColor: "#2D2928" }} />
        </div>
        <section className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 pt-10">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-x-3 md:gap-x-5 gap-y-12 items-start">
            <div className="md:col-span-2">
              <p className="font-title">MANAGEMENT</p>
            </div>
            {MANAGEMENT.map((p, i) => (
              <div key={p.label} className={i === 0 ? "md:col-span-1 md:col-start-3 font-body" : "md:col-span-1 font-body"}>
                <div className="aspect-[4/5] overflow-hidden w-full relative group">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover grayscale" />
                  {("video" in p && p.video) ? (
                    <video
                      src={p.video as string}
                      muted
                      loop
                      playsInline
                      preload="auto"
                      className="absolute inset-0 w-full h-full object-cover grayscale opacity-0 group-hover:opacity-100"
                      onMouseEnter={(e) => { e.currentTarget.currentTime = 0; e.currentTarget.play().catch(() => {}); }}
                      onMouseLeave={(e) => { e.currentTarget.pause(); }}
                    />
                  ) : null}
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

        {/* TALK TO A PRACTICE LEAD */}
        <section className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 ws-1">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-x-3 md:gap-x-5 gap-y-12 items-start">
            <div className="md:col-span-2">
              <p className="font-title">EXPERTISE LEADS</p>
            </div>
            {PRACTICE_LEADS.map((p, i) => (
              <div key={p.label} className={i === 0 ? "md:col-span-1 md:col-start-3 font-body" : "md:col-span-1 font-body"}>
                <div className="aspect-[4/5] overflow-hidden w-full">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover grayscale" />
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

        {/* DIRECT */}
        <div className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 ws-2">
          <hr className="border-0 border-t" style={{ borderColor: "#2D2928" }} />
        </div>
        <section className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 pt-10">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 md:gap-5 items-start">
            {FOOTER_LOCATIONS.map((l) => (
              <div key={l.city} className="md:col-span-2 font-body text-left">
                <div className="aspect-[4/3] overflow-hidden w-full mb-4">
                  <img src={l.image} alt={l.city} className="w-full h-full object-cover" />
                </div>
                <p className="font-nav mb-2">{l.city}</p>
                <p>{l.address}</p>
                <p>{l.zip}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="ws-2" />

      </ScrollPhysicsGroup>

      {/* PARALLAX BANNER */}
      <ParallaxBanner src={bannerImage} alt="Brigada studio" />
    </article>
  );
};

export default Contact;