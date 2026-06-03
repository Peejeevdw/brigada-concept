import type { CaseBlock } from "./types";

type Props = Extract<CaseBlock, { _type: "statBlock" }>;

export function StatBlock({ items }: Props) {
  if (!items || items.length === 0) return null;

  // Pick a column count that lays out the stats neatly: 1 → 1, 2 → 2,
  // 3 → 3, 4 → 2x2, 5/6 → 3x2.
  const colsClass =
    items.length <= 1
      ? "md:grid-cols-1"
      : items.length === 2
        ? "md:grid-cols-2"
        : items.length === 4
          ? "md:grid-cols-2"
          : "md:grid-cols-3";

  return (
    <section className="px-[clamp(24px,5vw,72px)] py-[clamp(64px,8vw,112px)]">
      <div className={`grid grid-cols-1 gap-[clamp(32px,4vw,64px)] ${colsClass}`}>
        {items.map((stat) => (
          <div key={stat._key} className="flex flex-col gap-3">
            <p className="font-display text-[clamp(48px,7vw,96px)] leading-none tracking-[-0.02em] text-brigada-black">
              {stat.value}
            </p>
            <p className="text-[clamp(13px,1.05vw,15px)] uppercase tracking-[0.12em] text-brigada-black/60">
              {stat.label}
            </p>
            {stat.description && (
              <p className="text-[clamp(14px,1.1vw,16px)] leading-[1.55] text-brigada-black/80">
                {stat.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
