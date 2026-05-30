import type { Pillar } from "@/components/wireframe/WorkThumb";

export interface ProjectService {
  pillar: Pillar;
  title: string;
}

export interface Project {
  slug: string;
  title: string;
  client: string;
  year: number;
  pillars: Pillar[];
  /** When false, listings render the card as non-interactive. */
  clickable: boolean;
  /** Highlighted on the homepage and at the top of the work index. */
  featured?: boolean;
  /** Optional short tagline for hero / cards. */
  tagline?: string;
  /** Services delivered, grouped per pillar. */
  services?: ProjectService[];
}

export const projects: Project[] = [
  {
    slug: "bmw",
    title: "A new chapter for the ultimate driving machine",
    client: "BMW",
    year: 2025,
    pillars: ["Brand", "Product", "Marketing"],
    clickable: true,
    featured: true,
    tagline: "Rebrand, naming strategy, design system and digital platform.",
    services: [
      { pillar: "Brand", title: "Brand identity design" },
      { pillar: "Brand", title: "Verbal identity, naming & tone of voice" },
      { pillar: "Brand", title: "Design systems and tools" },
      { pillar: "Product", title: "UX & Service Design" },
      { pillar: "Product", title: "Product Design Systems" },
      { pillar: "Product", title: "Full-Stack Development" },
      { pillar: "Marketing", title: "Creative platforms and campaigning" },
    ],
  },
  {
    slug: "agristo",
    title: "A potato-loving brand with bite",
    client: "Agristo",
    year: 2024,
    pillars: ["Brand", "Product", "Marketing"],
    clickable: true,
    tagline: "Brand world, employer platform and digital concepts for a family-run potato company.",
    services: [
      { pillar: "Brand", title: "Brand identity & art direction" },
      { pillar: "Brand", title: "Verbal identity & tone of voice" },
      { pillar: "Product", title: "Digital platform design" },
      { pillar: "Product", title: "Front-end development" },
      { pillar: "Marketing", title: "Employer branding campaign" },
    ],
  },
  { slug: "tui", title: "TUI", client: "TUI", year: 2025, pillars: ["Marketing", "People"], clickable: false },
  { slug: "politie", title: "Politie", client: "Politie", year: 2024, pillars: ["Brand", "Marketing"], clickable: false },
  { slug: "danone", title: "Danone", client: "Danone", year: 2024, pillars: ["Product", "Marketing", "People"], clickable: false },
  { slug: "editorial-series", title: "Editorial Series", client: "Golazo", year: 2024, pillars: ["Brand", "Marketing"], clickable: false },
  { slug: "spatial-story", title: "Spatial Story", client: "Client Six", year: 2024, pillars: ["Brand", "Product", "People"], clickable: false },
  { slug: "field-notes", title: "Field Notes", client: "Client Seven", year: 2023, pillars: ["Brand", "People"], clickable: false },
  { slug: "signal-report", title: "Signal Report", client: "Client Eight", year: 2023, pillars: ["Marketing", "Product"], clickable: false },
  { slug: "culture-lab", title: "Culture Lab", client: "Client Nine", year: 2023, pillars: ["People"], clickable: false },
  { slug: "onboarding-os", title: "Onboarding OS", client: "Client Ten", year: 2023, pillars: ["People", "Product"], clickable: false },
];

export const featuredProject = projects.find((p) => p.featured)!;
