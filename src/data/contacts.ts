import type { Pillar } from "@/components/wireframe/WorkThumb";

export interface PillarContact {
  pillar: Pillar;
  name: string;
  role: string;
  email: string;
  phone: string;
}

export const pillarContacts: PillarContact[] = [
  { pillar: "Brand", name: "[ Name placeholder ]", role: "Brand Lead", email: "brand@motion.xx", phone: "+00 000 00 00" },
  { pillar: "Marketing", name: "[ Name placeholder ]", role: "Marketing Lead", email: "marketing@motion.xx", phone: "+00 000 00 00" },
  { pillar: "Product", name: "[ Name placeholder ]", role: "Product Lead", email: "product@motion.xx", phone: "+00 000 00 00" },
  { pillar: "People", name: "[ Name placeholder ]", role: "People Lead", email: "people@motion.xx", phone: "+00 000 00 00" },
];
