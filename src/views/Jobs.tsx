"use client";

import Link from "next/link";
import { jobs } from "@/data/jobs";

const Jobs = () => (
  <div className="px-6 md:px-10 py-24">
    <p className="text-xs uppercase tracking-widest text-neutral-500 mb-6">
      Careers
    </p>
    <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-12">
      Open jobs
    </h1>
    <ul className="border-t border-neutral-200">
      {jobs.map((j) => (
        <li key={j.slug} className="border-b border-neutral-200">
          <Link
            href={`/careers/jobs/${j.slug}`}
            className="group flex items-center justify-between py-6 gap-6"
          >
            <div className="flex-1">
              <p className="text-xl md:text-2xl font-semibold group-hover:underline underline-offset-4">
                {j.title}
              </p>
              <p className="text-xs uppercase tracking-widest text-neutral-500 mt-2">
                {j.team} · {j.location} · {j.type}
              </p>
            </div>
            <span className="text-xs uppercase tracking-widest border-b border-neutral-900 pb-1 link-cta shrink-0">
              View →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

export default Jobs;