// Brand colour tokens — the single source of truth.
//
// Change a value here and it propagates everywhere:
//  - Tailwind utilities read it via tailwind.config.ts, which registers it as a
//    named colour. Use `bg-brigada-black`, `text-brigada-black`,
//    `border-brigada-black/15`, … (opacity modifiers work).
//  - JS/SVG colours (framer-motion colour transforms, canvas, inline styles,
//    CSS-in-JS template literals) import the constant directly.
//
// BRIGADA_BLACK is our near-black brand surface/ink colour. Pure #000 is
// intentionally reserved for true-black needs (e.g. dimming overlays, shadows).
export const BRIGADA_BLACK = "#181614";
