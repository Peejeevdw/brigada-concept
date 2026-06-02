"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import Placeholder from "@/components/wireframe/Placeholder";
import { jobs } from "@/data/jobs";

const JobDetail = () => {
  const params = useParams<{ slug?: string }>();
  const slug = params?.slug ?? "";
  const job = jobs.find((j) => j.slug === slug);

  if (!job) {
    return (
      <div className="px-6 md:px-10 py-24">
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-6">
          Careers
        </p>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Job not found
        </h1>
        <Link
          href="/careers/jobs"
          className="text-sm uppercase tracking-widest border-b border-neutral-900 pb-1 link-cta"
        >
          ← All open jobs
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="px-6 md:px-10 py-24">
        <Link
          href="/careers/jobs"
          className="text-xs uppercase tracking-widest text-neutral-500 hover:text-neutral-900 mb-10 inline-block"
        >
          ← All open jobs
        </Link>

        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-6">
          {job.team} · {job.location} · {job.type}
        </p>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-8">
          {job.title}
        </h1>
        <p className="max-w-2xl text-lg text-neutral-600 mb-12">
          Placeholder description of the role. Responsibilities, profile, and
          what we offer go here.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">
          <section>
            <h2 className="text-xs uppercase tracking-widest text-neutral-500 mb-4">
              About the role
            </h2>
            <p className="text-neutral-700">
              [ Placeholder paragraph describing the role and its impact within
              the team. ]
            </p>
          </section>
          <section>
            <h2 className="text-xs uppercase tracking-widest text-neutral-500 mb-4">
              Responsibilities
            </h2>
            <ul className="space-y-2 text-neutral-700 list-disc pl-5">
              <li>[ Placeholder responsibility ]</li>
              <li>[ Placeholder responsibility ]</li>
              <li>[ Placeholder responsibility ]</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xs uppercase tracking-widest text-neutral-500 mb-4">
              Profile
            </h2>
            <ul className="space-y-2 text-neutral-700 list-disc pl-5">
              <li>[ Placeholder requirement ]</li>
              <li>[ Placeholder requirement ]</li>
              <li>[ Placeholder requirement ]</li>
            </ul>
          </section>
        </div>

        <Placeholder
          label="TEAM IMAGE"
          shade="light"
          className="aspect-[16/9] w-full mb-20"
        />

        <div className="border border-neutral-200 p-8 max-w-2xl flex flex-col sm:flex-row gap-6 items-start">
          <Placeholder
            label="PORTRAIT"
            shade="light"
            className="w-32 h-32 shrink-0"
          />
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
              Questions about this role?
            </p>
            <p className="text-lg font-semibold">{job.contact.name}</p>
            <p className="text-sm text-neutral-600 mb-4">{job.contact.role}</p>
            <div className="space-y-1 text-sm">
              <p>
                <a
                  href={`mailto:${job.contact.email}`}
                  className="border-b border-neutral-900 pb-0.5 link-cta"
                >
                  {job.contact.email}
                </a>
              </p>
              <p className="text-neutral-600">{job.contact.phone}</p>
            </div>
          </div>
        </div>
      </div>


      <section
        id="apply"
        className="border-t border-neutral-200 px-6 md:px-10 py-24"
      >
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-neutral-500 mb-6">
            Apply
          </p>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">
            Apply for {job.title}
          </h2>
          <p className="text-lg text-neutral-600 mb-12">
            Send us your details and a CV. We'll get back to you shortly.
          </p>

          <form className="space-y-6 max-w-2xl">
            <div>
              <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-2">
                Name
              </label>
              <div className="h-12 border border-neutral-300 bg-neutral-50" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-2">
                Email
              </label>
              <div className="h-12 border border-neutral-300 bg-neutral-50" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-2">
                Motivation
              </label>
              <div className="h-40 border border-neutral-300 bg-neutral-50" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-2">
                CV
              </label>
              <div className="border border-dashed border-neutral-400 bg-neutral-50 px-6 py-10 flex flex-col items-center justify-center text-center gap-2">
                <p className="text-sm text-neutral-700">
                  Drop your CV here or click to upload
                </p>
                <p className="text-xs uppercase tracking-widest text-neutral-500">
                  PDF, DOC, DOCX · max 10MB
                </p>
              </div>
            </div>

            <button
              type="button"
              className="mt-4 text-sm uppercase tracking-widest border-b border-neutral-900 pb-1 link-cta"
            >
              Send application →
            </button>
          </form>
        </div>
      </section>
    </>
  );
};

export default JobDetail;