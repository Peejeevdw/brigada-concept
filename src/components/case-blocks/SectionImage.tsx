import { urlFor } from "@/lib/sanity";
import type { CaseBlock } from "./types";

type Props = Extract<CaseBlock, { _type: "sectionImage" }>;

export function SectionImage({ image, caption, variant = "inline" }: Props) {
  if (!image?.asset) return null;
  const builder = urlFor(image);
  const src = builder ? builder.width(2400).fit("max").auto("format").url() : "";
  if (!src) return null;

  const wrapperClass =
    variant === "full-bleed"
      ? "w-full"
      : "px-[clamp(24px,5vw,72px)] py-[clamp(40px,5vw,72px)]";

  return (
    <section className={wrapperClass}>
      <figure>
        <img
          src={src}
          alt={image.alt ?? ""}
          className="block w-full h-auto"
          loading="lazy"
        />
        {(caption || image.caption) && (
          <figcaption className="mt-3 px-[clamp(24px,5vw,72px)] text-[clamp(12px,1vw,14px)] opacity-60">
            {caption ?? image.caption}
          </figcaption>
        )}
      </figure>
    </section>
  );
}
