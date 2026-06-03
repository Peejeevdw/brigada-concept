import { PortableText } from "@portabletext/react";
import type { CaseBlock } from "./types";

type Props = Extract<CaseBlock, { _type: "richText" }>;

const WIDTH_CLASS: Record<NonNullable<Props["width"]>, string> = {
  narrow: "md:w-[55%]",
  medium: "md:w-[70%]",
  wide: "md:w-full",
};

export function RichText({ body, width = "medium" }: Props) {
  if (!body || body.length === 0) return null;
  return (
    <section className="px-[clamp(24px,5vw,72px)] py-[clamp(40px,5vw,72px)]">
      <div
        className={`font-body text-[clamp(15px,1.25vw,18px)] leading-[1.6] text-brigada-black ${WIDTH_CLASS[width]} [&_h2]:font-display [&_h2]:text-[clamp(24px,2.5vw,38px)] [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:first:mt-0 [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-6 [&_p+p]:mt-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mt-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mt-4 [&_a]:underline`}
      >
        <PortableText value={body} />
      </div>
    </section>
  );
}
