import { RichText } from "./RichText";
import { SectionImage } from "./SectionImage";
import { ImageGrid } from "./ImageGrid";
import { VideoEmbed } from "./VideoEmbed";
import { Quote } from "./Quote";
import { StatBlock } from "./StatBlock";
import type { CaseBlock } from "./types";

/**
 * Renders one case-body block, dispatched by `_type`. Unknown _types are
 * rendered as nothing (forward-compatible if new block types ship before
 * the FE catches up).
 */
export function BlockRenderer({ block }: { block: CaseBlock }) {
  switch (block._type) {
    case "richText":
      return <RichText {...block} />;
    case "sectionImage":
      return <SectionImage {...block} />;
    case "imageGrid":
      return <ImageGrid {...block} />;
    case "videoEmbed":
      return <VideoEmbed {...block} />;
    case "quote":
      return <Quote {...block} />;
    case "statBlock":
      return <StatBlock {...block} />;
    default:
      return null;
  }
}
