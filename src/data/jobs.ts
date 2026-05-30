import type { Location } from "./locations";

export interface JobContact {
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface Job {
  slug: string;
  title: string;
  team: string;
  location: Location["city"];
  type: string;
  contact: JobContact;
}

export const jobs: Job[] = [
  {
    slug: "senior-brand-strategist",
    title: "Senior Brand Strategist",
    team: "Brand",
    location: "Brigada Brussels",
    type: "Full-time",
    contact: {
      name: "[ Recruiter name ]",
      role: "Talent Partner, Brand",
      email: "jobs.brand@motion.xx",
      phone: "+32 0 000 00 01",
    },
  },
  {
    slug: "creative-director",
    title: "Creative Director",
    team: "Brand",
    location: "Brigada Gent",
    type: "Full-time",
    contact: {
      name: "[ Recruiter name ]",
      role: "Senior Talent Partner",
      email: "jobs.creative@motion.xx",
      phone: "+32 0 000 00 02",
    },
  },
  {
    slug: "motion-designer",
    title: "Motion Designer",
    team: "Product",
    location: "Brigada Gent",
    type: "Full-time",
    contact: {
      name: "[ Recruiter name ]",
      role: "Talent Partner, Product",
      email: "jobs.motion@motion.xx",
      phone: "+32 0 000 00 03",
    },
  },
  {
    slug: "account-lead",
    title: "Account Lead",
    team: "Marketing",
    location: "Brigada Brussels",
    type: "Full-time",
    contact: {
      name: "[ Recruiter name ]",
      role: "Talent Partner, Marketing",
      email: "jobs.accounts@motion.xx",
      phone: "+32 0 000 00 04",
    },
  },
  {
    slug: "product-designer",
    title: "Product Designer",
    team: "Product",
    location: "Brugge",
    type: "Full-time",
    contact: {
      name: "[ Recruiter name ]",
      role: "Talent Partner, Product",
      email: "jobs.design@motion.xx",
      phone: "+32 0 000 00 05",
    },
  },
];
