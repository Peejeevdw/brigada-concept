import type { PortableTextBlock } from "@portabletext/react";

/**
 * The shape of each entry in a Sanity `work.body` page-builder array.
 * Discriminated by `_type` — every block component picks itself by checking
 * its own _type in BlockRenderer.
 */
export type CaseBlock =
  | { _key: string; _type: "richText"; body: PortableTextBlock[]; width?: "narrow" | "medium" | "wide" }
  | {
      _key: string;
      _type: "sectionImage";
      image?: SanityImage;
      caption?: string;
      variant?: "inline" | "full-bleed";
    }
  | {
      _key: string;
      _type: "imageGrid";
      columns?: 2 | 3;
      images?: SanityImage[];
    }
  | {
      _key: string;
      _type: "videoEmbed";
      hlsUrl?: string;
      file?: { asset?: { url?: string } };
      poster?: SanityImage;
      aspect?: "16/9" | "21/9" | "4/5" | "1/1";
      autoplay?: boolean;
    }
  | {
      _key: string;
      _type: "quote";
      text?: string;
      author?: string;
      role?: string;
    }
  | {
      _key: string;
      _type: "statBlock";
      items?: { _key: string; value?: string; label?: string; description?: string }[];
    };

export interface SanityImage {
  _type?: "image";
  asset?: { _ref?: string; url?: string };
  alt?: string;
  caption?: string;
  hotspot?: { x: number; y: number; height: number; width: number };
  crop?: { top: number; bottom: number; left: number; right: number };
}
