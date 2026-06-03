"use client";

import { usePathname } from "next/navigation";
import { VisualEditing } from "@sanity/visual-editing/react";

/**
 * Draft Mode overlay: shows an exit-preview pill in the bottom-left and
 * mounts Sanity's `<VisualEditing />` overlay for the bottom-right toolbar.
 * Imported as a single client island so the server layout doesn't drag any
 * createContext-using modules into the RSC graph.
 */
export function DraftModeBanner() {
  const pathname = usePathname() ?? "/";
  return (
    <>
      <a
        href={`/api/draft/disable?returnTo=${encodeURIComponent(pathname)}`}
        className="fixed bottom-3 left-3 z-[9999] inline-flex items-center gap-2 rounded-full bg-black px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-white shadow-lg hover:bg-neutral-800"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        Draft mode · Exit preview
      </a>
      <VisualEditing />
    </>
  );
}
