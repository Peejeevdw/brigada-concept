"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { VisualEditing } from "@sanity/visual-editing/react";

/**
 * Draft Mode overlay. Two responsibilities:
 *
 * - Always render an exit-preview pill so a user who landed in Draft Mode
 *   has a visible way out.
 * - Mount Sanity's `<VisualEditing />` overlay only when the page is loaded
 *   inside Sanity Studio's Presentation tool (i.e. as an iframed child).
 *   On the live frontend we don't want clickable "Open in Studio" badges —
 *   editing should be initiated from Studio, not from the public site.
 */
export function DraftModeBanner() {
  const pathname = usePathname() ?? "/";
  const [isPresentationFrame, setIsPresentationFrame] = useState(false);

  useEffect(() => {
    setIsPresentationFrame(window.self !== window.top);
  }, []);

  return (
    <>
      <a
        href={`/api/draft/disable?returnTo=${encodeURIComponent(pathname)}`}
        className="fixed bottom-3 left-3 z-[9999] inline-flex items-center gap-2 rounded-full bg-black px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-white shadow-lg hover:bg-neutral-800"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        Draft mode · Exit preview
      </a>
      {isPresentationFrame && <VisualEditing />}
    </>
  );
}
