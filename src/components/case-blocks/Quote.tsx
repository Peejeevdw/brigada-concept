import type { CaseBlock } from "./types";

type Props = Extract<CaseBlock, { _type: "quote" }>;

export function Quote({ text, author, role }: Props) {
  if (!text) return null;
  return (
    <section className="px-[clamp(24px,5vw,72px)] py-[clamp(64px,8vw,112px)]">
      <figure className="md:w-[80%] mx-auto">
        <blockquote className="font-display text-[clamp(24px,3.5vw,52px)] leading-[1.15] tracking-[-0.01em] text-brigada-black">
          <span aria-hidden>“</span>
          {text}
          <span aria-hidden>”</span>
        </blockquote>
        {(author || role) && (
          <figcaption className="mt-[clamp(20px,2vw,32px)] text-[clamp(13px,1.05vw,15px)] uppercase tracking-[0.12em] text-brigada-black/60">
            {[author, role].filter(Boolean).join(" · ")}
          </figcaption>
        )}
      </figure>
    </section>
  );
}
