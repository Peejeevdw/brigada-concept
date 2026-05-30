import type { Pillar } from "@/components/wireframe/WorkThumb";

export interface PillarContent {
  pillar: Pillar;
  tagline: string;
  eyebrow: string;
  leadIn: string;
  intro: string;
  servicesIntro: string;
  services: { title: string; description: string }[];
}


export const pillarContent: Record<Pillar, PillarContent> = {
  Brand: {
    pillar: "Brand",
    tagline: "the source of movement",
    eyebrow: "How we move your",
    leadIn: "{name} is the guy to talk to.",

    intro:
      "We craft brands. We give them purpose and personality, and we make them look, sound and feel like they've got a pulse.",
    servicesIntro:
      "From the first strategic decision to the last asset shipped, our brand services cover positioning, identity, voice and the systems that hold it all together.",
    services: [
      {
        title: "Brand strategy & platforms",
        description:
          "is where we define what your brand stands for, who it's for and the platforms that hold every decision together.",
      },
      {
        title: "Naming, verbal & sonic identity",
        description:
          "is the language and sound of your brand, from names that stick to a voice and audio signature unlike anyone else.",
      },
      {
        title: "Brand identity concept & design",
        description:
          "is the visual world of your brand: logo, typography, colour, imagery and the rules that make them work as one.",
      },
      {
        title: "Motion to spatial identity design",
        description:
          "is the brand expressed in time and space, from animated logos to environments people walk through.",
      },
      {
        title: "Brand implementation & management",
        description:
          "covers rollout, design systems, tooling and the brand portal that keep work on-brand at scale.",
      },
    ],
  },
  Product: {
    pillar: "Product",
    tagline: "where movement takes shape",
    eyebrow: "You'll love your new",
    leadIn: "Have you met {name} yet?",

    intro:
      "We develop tools, platforms and websites that people actually use, and digital experiences they're moved by.",
    servicesIntro:
      "Our product services span the full lifecycle, from early research and prototyping to design systems, AI integration and the engineering that puts it all in production.",
    services: [
      {
        title: "Product strategy & innovation",
        description:
          "decides what to build (and what not to) based on your brand, your business goals and where the real opportunities sit.",
      },
      {
        title: "Experience design (CX/UX)",
        description:
          "connects what your business needs with what your customers expect, across every step of the journey.",
      },
      {
        title: "Digital product design",
        description:
          "shapes the interfaces, flows and design systems that make your product useful, usable and unmistakably yours.",
      },
      {
        title: "Full Stack development & delivery",
        description:
          "covers websites, apps, platforms and everything under the hood to ship and run them in production.",
      },
      {
        title: "AI strategy & execution",
        description:
          "puts AI where it actually adds value, not where it sounds impressive in a deck.",
      },
    ],
  },
  Marketing: {
    pillar: "Marketing",
    tagline: "where movement scales",
    eyebrow: "Not your run-of-the-mill",
    leadIn: "{name} is the one to talk to.",

    intro:
      "We create the strategy, content, live experiences and campaigns that pull people in and make them stick around.",
    servicesIntro:
      "Our marketing services connect strategy, creative and media, from always-on content and performance to campaigns, creators and live experience.",
    services: [
      {
        title: "Go-to-market strategy",
        description:
          "lines up positioning, channels and timing into one plan that gets your brand in front of the right people.",
      },
      {
        title: "Campaigns & creative",
        description:
          "are the big creative ideas that hold a brand together over time and flex across every channel.",
      },
      {
        title: "Social & influencer",
        description:
          "puts your brand into the feeds and voices your audience already trusts, with strategy and craft behind it.",
      },
      {
        title: "Live experiences & activations",
        description:
          "are brand made physical, designed moments people remember long after they leave the room.",
      },
      {
        title: "Content & production",
        description:
          "is the always-on engine of film, photo and copy that keeps your brand present, useful and visible.",
      },
      {
        title: "Media & performance",
        description:
          "turns attention into action, with planning and buying tuned to measurable outcomes.",
      },
      {
        title: "Data & optimization",
        description:
          "closes the loop with insight and experimentation, so every next campaign works a little harder than the last.",
      },
    ],
  },
  People: {
    pillar: "People",
    tagline: "where movement becomes culture",
    eyebrow: "How we move your",
    leadIn: "{name} is the one to talk to.",

    intro:
      "We help companies stop sounding like companies. We build cultures, guide change and tell stories candidates & employees actually connect with and want to rally behind.",
    servicesIntro:
      "Our people services cover the full employee journey, from employer brand and candidate experience to onboarding, internal communication and change.",
    services: [
      {
        title: "Employer branding",
        description:
          "is how your organisation shows up as a place to work, with a clear promise that attracts the right people.",
      },
      {
        title: "Candidate experience",
        description:
          "is every touchpoint from first ad to first day, designed so great people want to say yes.",
      },
      {
        title: "Employee experience",
        description:
          "is the day-to-day reality of working with you, shaped on purpose instead of left to chance.",
      },
      {
        title: "Culture and change design",
        description:
          "shapes the rituals, behaviours and communication that move your organisation through change as one.",
      },
    ],
  },
};
