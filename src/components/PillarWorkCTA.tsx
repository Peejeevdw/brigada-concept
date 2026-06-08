"use client";

import { motion } from "framer-motion";
import { usePageTransition } from "@/components/PageTransition";
import { GUTTER, EASE_OUT } from "@/lib/siteTokens";

/**
 * "Discover all our <pillar> work →" link, dropped on each service-category
 * detail page just above the pillar's contact block. Routes to
 * `/work?filter=<slug>` so the work index opens with that pillar's tab
 * already active. `WorkFilter` reads the query param on mount.
 *
 * Visually subtle on purpose — a small uppercase line, not a big heading.
 */
export default function PillarWorkCTA({
  pillarSlug,
  pillarName,
}: {
  pillarSlug: string;
  pillarName: string;
}) {
  const transitionTo = usePageTransition();
  return (
    <section className={`${GUTTER} pt-[clamp(20px,2.5vw,32px)] pb-[clamp(8px,1vw,16px)]`}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      >
        <button
          type="button"
          onClick={() => transitionTo(`/work?filter=${encodeURIComponent(pillarSlug)}`)}
          className="group inline-flex items-center gap-2 text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60 transition-opacity hover:opacity-100"
        >
          <span className="link-underline">
            Discover all our {pillarName.toLowerCase()} work
          </span>
          <span className="relative inline-block transition-transform duration-300 ease-out group-hover:translate-x-1">
            →
          </span>
        </button>
      </motion.div>
    </section>
  );
}
