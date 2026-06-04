// Brigada office locations (data from /contact-v2) — shown in the site footers
// as a "Locations" column; each office reveals its address + phone on
// hover/click. Single source so the footers stay in sync.
export interface OfficeLocation {
  city: string;
  address: string;
  zip: string;
  phone: string;
}

export const officeLocations: OfficeLocation[] = [
  { city: "Antwerp", address: "Molenstraat 54", zip: "2018 Antwerpen", phone: "+32 3 443 29 00" },
  { city: "Brussels", address: "Waelhemstraat 77", zip: "1030 Brussels", phone: "+32 2 427 24 14" },
  { city: "Ghent", address: "Amelia Earhartlaan 2 Bus 401", zip: "9051 Ghent", phone: "+32 9 123 45 67" },
];
