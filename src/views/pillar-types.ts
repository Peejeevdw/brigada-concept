/**
 * Shared shape of the data passed from `app/<pillar>/page.tsx` server
 * components into the four pillar view components.
 *
 * Optional fields — every pillar view falls back to its hardcoded contact +
 * brio palette when Sanity is unconfigured or has no service doc for the
 * slug yet.
 */
export interface PillarService {
  _id?: string;
  name?: string | null;
  slug?: string | null;
  eyebrow?: string | null;
  tagline?: string | null;
  intro?: string | null;
  servicesIntro?: string | null;
  services?: Array<{ title?: string | null; description?: string | null }> | null;
  brioPaletteId?: string | null;
  leadIn?: string | null;
  lead?: {
    _id?: string;
    name?: string | null;
    position?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
}

export interface PillarViewProps {
  service?: PillarService | null;
}
