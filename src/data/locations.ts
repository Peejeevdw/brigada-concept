export interface Location {
  city: string;
  street: string;
  postal: string;
  country: string;
  phone: string;
  email: string;
}

export const locations: Location[] = [
  { city: "Brigada Brussels", street: "[ Street 00 ]", postal: "1000 Brussels", country: "Belgium", phone: "+32 0 000 00 00", email: "brussels@motion.xx" },
  { city: "Brigada Gent", street: "[ Street 00 ]", postal: "9000 Gent", country: "Belgium", phone: "+32 0 000 00 00", email: "gent@motion.xx" },
  { city: "Brigada Gent", street: "[ Street 00 ]", postal: "2000 Antwerp", country: "Belgium", phone: "+32 0 000 00 00", email: "antwerp@motion.xx" },
  { city: "Brugge", street: "[ Street 00 ]", postal: "8000 Brugge", country: "Belgium", phone: "+32 0 000 00 00", email: "brugge@motion.xx" },
];
