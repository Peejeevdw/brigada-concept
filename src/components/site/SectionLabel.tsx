import type { ReactNode } from "react";

// Section title that sits in the left column of the new-style section blocks
// (e.g. "Brand" next to the disciplines list).
const SectionLabel = ({ children }: { children: ReactNode }) => (
  <h2
    className="shrink-0 text-[clamp(18px,1.5vw,22px)] uppercase leading-none"
    style={{ fontWeight: 500 }}
  >
    {children}
  </h2>
);

export default SectionLabel;
