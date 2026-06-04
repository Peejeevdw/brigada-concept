import CaseLayout, { type CaseData, type WorkLayoutData } from "@/views/CaseLayout";

export type { WorkLayoutData };

// Built-in sample content shown on /work-lab until a case has the new layout
// fields filled in. The real detail page (/work/[slug]) never uses this.
const MOCK_CASE: CaseData = {
  hero: { type: "image", src: "/tui-image.jpg" },
  title: "Inviting BMW to reflect on its future",
  client: "BMW",
  projectInfo: {
    sections: [
      {
        id: "summary",
        title: "Summary",
        body: [
          "The launch of the BMW Neue Klasse X became a reflection on the future of BMW. Our live experience encouraged 4,000 guests to look in the mirror and find answers within themselves.",
        ],
      },
      {
        id: "challenge",
        title: "The challenge",
        body: [
          "The European automotive industry is undergoing a rapid transformation. Government regulations are changing at the speed of light, just like consumer preferences, and the pressure from Asian competitors is on. But with its reveal of the Neue Klasse X, BMW showed that it’s ready for the future. The brand came to us looking for an event that would go beyond a car show. They wanted a live experience that would underline BMW’s holistic approach to the market, its core values and unwavering faith in the future-proofness of its product range.",
        ],
      },
      {
        id: "approach",
        title: "The approach",
        body: [
          "Triggered by the question “What is our future?”, we came up with REFLECTED: a universe that generates answers by looking in the mirror. For ten evenings, our 360-degrees biotope immersed attendees in a reflective experience, making them realise that the answers lie within themselves.",
          "Together with two disruptive architects, we created an event concept based on the X pattern, a reference to the Neue Klasse X. A stunning LED screen installation was concealed behind an innovative mirrored fabric, allowing the screens to disappear from view and surprise guests. REFLECTED got a tailor-made score by Jef Neve, one of Belgium’s best-known composers. In addition, the experience featured a contemporary choreography based on reflective movements, created by Femke Gyselinck.",
        ],
      },
      {
        id: "impact",
        title: "The impact",
        body: [
          "An electric or hydrogen-powered BMW may not look radically different from a conventional car, but beneath the surface, the drivetrain is entirely different. It reflects the future of mobility. REFLECTED followed the same principle. At first glance, it was an experience designed to bring people together and touch their hearts. Yet beneath the surface, its driving forces were equally disruptive. Authentic storytelling is one of st assets our industry has to offer, and REFLECTED brought that belief to life.",
        ],
      },
    ],
    services: ["Launch", "Employer branding", "Live experience"],
  },
  gallery: [
    { items: [{ type: "image", src: "/concept-hero.jpg" }], fullBleed: false },
    {
      items: [
        { type: "image", src: "/mm-1.jpg" },
        { type: "image", src: "/mm-2.jpg" },
        { type: "image", src: "/mm-3.jpg" },
      ],
      fullBleed: false,
    },
    {
      items: [
        { type: "image", src: "/meetmarcel.jpg" },
        { type: "image", src: "/mm-4.jpg" },
      ],
      fullBleed: false,
    },
  ],
};

export default function WorkLab({ data = null }: { data?: WorkLayoutData | null }) {
  return <CaseLayout data={data} mockFallback mock={MOCK_CASE} />;
}
