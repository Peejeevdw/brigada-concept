import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

import productCase1 from "@/assets/product-case-1.png";
import productCase2 from "@/assets/product-case-2.png";
import productCase3 from "@/assets/product-case-3.png";
import productCase5 from "@/assets/product-case-5.png";

// Skiper 52 "HoverExpand_001" (React + Framer Motion) — a FIXED row of images
// that do NOT translate; the active one expands wide while the others shrink to
// thin strips. Hover or click to activate. Adapted to the site: square corners
// (no rounded-3xl) to match the slider preference, default images = the shared
// placeholders. Attribution: Skiper UI — illustrations by AarzooAly.

export type HoverExpandImage = { src: string; alt: string; code: string };

const DEFAULT_IMAGES: HoverExpandImage[] = [
  { src: productCase1, alt: "Placeholder", code: "Placeholder" },
  { src: productCase2, alt: "Placeholder", code: "Placeholder" },
  { src: productCase3, alt: "Placeholder", code: "Placeholder" },
  { src: productCase5, alt: "Placeholder", code: "Placeholder" },
];

const HoverExpand = ({
  images = DEFAULT_IMAGES,
  className,
}: {
  images?: HoverExpandImage[];
  className?: string;
}) => {
  const [activeImage, setActiveImage] = useState<number | null>(1);

  return (
    <motion.div
      initial={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
      className={cn("relative w-full", className)}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <div className="flex w-full items-stretch gap-1">
          {images.map((image, index) => (
            <motion.div
              key={index}
              className="relative h-[clamp(20rem,38vw,35rem)] min-w-0 cursor-pointer overflow-hidden"
              style={{ flexBasis: 0 }}
              initial={{ flexGrow: 1 }}
              animate={{ flexGrow: activeImage === index ? 6 : 1 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              onClick={() => setActiveImage(index)}
              onHoverStart={() => setActiveImage(index)}
            >
              <AnimatePresence>
                {activeImage === index && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute h-full w-full bg-gradient-to-t from-black/40 to-transparent"
                  />
                )}
              </AnimatePresence>
              <AnimatePresence>
                {activeImage === index && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute flex h-full w-full flex-col items-end justify-end p-4"
                  >
                    <p className="text-left text-xs text-white/50">{image.code}</p>
                  </motion.div>
                )}
              </AnimatePresence>
              <img src={image.src} className="size-full object-cover" alt={image.alt} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default HoverExpand;
