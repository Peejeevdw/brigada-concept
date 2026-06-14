/**
 * Shared shape of the data passed from `app/<pillar>/page.tsx` server
 * components into the four pillar view components. Each pillar view
 * receives ONE service-category document (Brand / Marketing / People /
 * Product) which contains a list of individual services in `services[]`.
 *
 * Optional fields — every pillar view falls back to its hardcoded contact +
 * brio palette when Sanity is unconfigured or has no serviceCategory doc
 * for the slug yet.
 */
export interface ServiceCategoryDoc {
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

/**
 * One case (a `work` doc) linked to this service category, as returned by the
 * `cases` query in `getServiceCategory` (shape = WORK_LIST_PROJECTION). Feeds
 * the "related cases" slider/orbit at the bottom of each pillar page.
 */
export interface WorkListItem {
  _id?: string;
  name?: string | null;
  client?: string | null;
  slug?: string | null;
  image?: unknown;
  lqip?: string | null;
  thumbVimeoId?: string | null;
  thumbVideoUrl?: string | null;
}

export interface PillarViewProps {
  category?: ServiceCategoryDoc | null;
  // Cases linked to this category via their `serviceCategories[]` refs. The
  // bottom "related cases" section renders these; when empty, the view falls
  // back to its placeholder visuals.
  cases?: (WorkListItem | null)[] | null;
}
