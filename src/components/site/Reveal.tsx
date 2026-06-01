import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/lib/siteTokens";

// Subtle fade-up reveal on scroll into view — the concept-style polish shared
// by the new pages. Plays once.
const Reveal = ({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-10% 0px" }}
    transition={{ duration: 0.7, ease: EASE_OUT, delay }}
  >
    {children}
  </motion.div>
);

export default Reveal;
