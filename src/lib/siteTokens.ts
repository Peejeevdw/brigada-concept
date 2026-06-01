// Shared design tokens for the new-style ("concept"/"brand") site pages — the
// single source of truth so pages stop hand-rolling these. The typographic
// source of truth lives in index.css (the .font-* roles); these are the
// non-typographic constants that were copy-pasted across every new page.

// Antarctica stack. Most text inherits this from the body / .font-* classes;
// keep this for the rare inline style that still needs an explicit family.
export const SANS = '"Antarctica", system-ui, sans-serif';

// framer-motion easing used across all new-style pages (ease-out, expo-ish).
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// Page gutter — full-bleed content with side padding only (no centred
// max-width), matching /concept and /brand.
export const GUTTER = "px-[clamp(24px,5vw,72px)]";

// Ink (text) colours used by the section blocks on the new pages.
export const INK = {
  dark: "#2d2928",
  white: "#ffffff",
} as const;
