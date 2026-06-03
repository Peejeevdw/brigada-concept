import Link from "next/link";
import type { JobListItem } from "@/lib/sanity-fetch";

const Jobs = ({ jobs }: { jobs: JobListItem[] }) => (
  <main className="px-[clamp(24px,5vw,72px)] pt-[clamp(120px,18vw,200px)] pb-[clamp(80px,12vw,160px)]">
    <p className="mb-6 text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60">
      Careers
    </p>
    <h1 className="font-display text-[clamp(32px,5.56vw,80px)] leading-[1.06] tracking-[-0.01em]">
      Open jobs
    </h1>

    {jobs.length === 0 ? (
      <p className="mt-[clamp(40px,5vw,72px)] text-[clamp(16px,1.2vw,18px)] text-brigada-black/70">
        No open roles at the moment — check back soon.
      </p>
    ) : (
      <ul className="mt-[clamp(40px,5vw,72px)] border-t border-brigada-black/10">
        {jobs.map((j) => {
          const meta = [j.expertise, j.location?.city || j.location?.title, j.type]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={j._id} className="border-b border-brigada-black/10">
              <Link
                href={`/careers/jobs/${j.slug}`}
                className="group flex flex-col gap-3 py-[clamp(20px,2vw,28px)] md:flex-row md:items-center md:justify-between md:gap-6"
              >
                <div className="flex-1">
                  <p className="text-[clamp(20px,2vw,28px)] font-medium leading-[1.1] tracking-[-0.01em] group-hover:underline underline-offset-4">
                    {j.name}
                  </p>
                  {meta && (
                    <p className="mt-2 text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60">
                      {meta}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60 transition-opacity group-hover:opacity-100">
                  View →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    )}
  </main>
);

export default Jobs;
