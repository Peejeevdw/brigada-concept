import { urlFor } from "@/lib/sanity";
import type { CaseBlock } from "./types";

type Props = Extract<CaseBlock, { _type: "imageGrid" }>;

export function ImageGrid({ columns = 2, images }: Props) {
  if (!images || images.length === 0) return null;
  const colsClass =
    columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2";

  return (
    <section className="px-[clamp(24px,5vw,72px)] py-[clamp(40px,5vw,72px)]">
      <div className={`grid grid-cols-1 gap-3 md:gap-5 ${colsClass}`}>
        {images.map((img, i) => {
          const builder = img?.asset ? urlFor(img) : null;
          const src = builder ? builder.width(1600).fit("max").auto("format").url() : null;
          if (!src) return null;
          return (
            <figure key={i} className="flex flex-col">
              <img
                src={src}
                alt={img.alt ?? ""}
                className="block w-full h-auto"
                loading="lazy"
              />
              {img.caption && (
                <figcaption className="mt-2 text-[clamp(12px,1vw,14px)] opacity-60">
                  {img.caption}
                </figcaption>
              )}
            </figure>
          );
        })}
      </div>
    </section>
  );
}
