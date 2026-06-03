"use client";

import { useState } from "react";
import Link from "next/link";
import { PortableText, type PortableTextBlock } from "@portabletext/react";

interface JobFormField {
  _key?: string;
  name?: string | null;
  label?: string | null;
  type?: string | null;
  required?: boolean | null;
  placeholder?: string | null;
  options?: string[] | null;
  span?: "half" | "full" | null;
}

export interface JobData {
  _id?: string;
  slug?: string | null;
  name?: string | null;
  type?: string | null;
  introIndex?: string | null;
  introDetail?: string | null;
  jobDescription?: PortableTextBlock[] | null;
  profile?: PortableTextBlock[] | null;
  offer?: PortableTextBlock[] | null;
  expertise?: { _id?: string; name?: string | null; slug?: string | null } | null;
  location?: { _id?: string; title?: string | null; city?: string | null } | null;
  contact?: {
    _id?: string;
    name?: string | null;
    position?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  form?: {
    intro?: string | null;
    submitLabel?: string | null;
    successMessage?: string | null;
    fields?: JobFormField[] | null;
  } | null;
}

const portableBody = {
  block: {
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="font-display mt-[clamp(28px,3vw,44px)] text-[clamp(22px,2vw,30px)] font-medium leading-[1.15] tracking-[-0.01em]">
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="mt-[clamp(20px,2vw,32px)] text-[clamp(18px,1.6vw,22px)] font-medium leading-[1.2]">
        {children}
      </h3>
    ),
    normal: ({ children }: { children?: React.ReactNode }) => (
      <p className="mt-[clamp(12px,1vw,18px)] text-[clamp(16px,1.2vw,18px)] leading-[1.55] text-brigada-black/80">
        {children}
      </p>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="mt-[clamp(20px,2vw,32px)] border-l-2 border-brigada-black/30 pl-5 text-[clamp(18px,1.4vw,22px)] italic">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }: { children?: React.ReactNode }) => (
      <ul className="mt-[clamp(12px,1vw,16px)] list-disc space-y-2 pl-5 text-[clamp(16px,1.2vw,18px)] leading-[1.55] text-brigada-black/80">
        {children}
      </ul>
    ),
    number: ({ children }: { children?: React.ReactNode }) => (
      <ol className="mt-[clamp(12px,1vw,16px)] list-decimal space-y-2 pl-5 text-[clamp(16px,1.2vw,18px)] leading-[1.55] text-brigada-black/80">
        {children}
      </ol>
    ),
  },
};

const inputClass =
  "w-full border-b border-brigada-black bg-transparent pb-3 text-[clamp(16px,1.4vw,20px)] outline-none transition-colors placeholder:opacity-40 focus:border-opacity-100";

const JobDetail = ({ job }: { job: JobData | null }) => {
  // Local "sent" state — see TODO at the submit handler for the wiring plan.
  const [sent, setSent] = useState(false);

  if (!job) {
    return (
      <main className="px-[clamp(24px,5vw,72px)] py-24">
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-6">Careers</p>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Job not found</h1>
        <Link
          href="/careers/jobs"
          className="text-sm uppercase tracking-widest border-b border-neutral-900 pb-1"
        >
          ← All open jobs
        </Link>
      </main>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to /api/jobs/apply. Local optimistic state only for now —
    // intentionally no network call so we surface the UI without a backend.
    setSent(true);
  };

  const meta = [job.expertise?.name, job.location?.city || job.location?.title, job.type]
    .filter(Boolean)
    .join(" · ");

  const formIntro = job.form?.intro ?? "";
  const submitLabel = job.form?.submitLabel ?? "Send application";
  const successMessage = job.form?.successMessage ?? "";
  const formFields = job.form?.fields ?? [];

  return (
    <main className="min-h-screen w-full">
      <div className="px-[clamp(24px,5vw,72px)] pt-[clamp(120px,18vw,200px)] pb-[clamp(60px,8vw,120px)]">
        <Link
          href="/careers/jobs"
          className="mb-10 inline-block text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60 transition-opacity hover:opacity-100"
        >
          ← All open jobs
        </Link>

        {meta && (
          <p className="mb-6 text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60">
            {meta}
          </p>
        )}
        <h1 className="font-display text-[clamp(32px,5.56vw,80px)] leading-[1.06] tracking-[-0.01em]">
          {job.name}
        </h1>
        {job.introDetail && (
          <p className="mt-[clamp(20px,2vw,32px)] max-w-3xl text-[clamp(18px,1.5vw,22px)] leading-[1.45] text-brigada-black/70">
            {job.introDetail}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-12 px-[clamp(24px,5vw,72px)] pb-[clamp(80px,10vw,160px)] md:grid-cols-3">
        {job.jobDescription && job.jobDescription.length > 0 && (
          <section>
            <h2 className="text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60">
              The role
            </h2>
            <div className="mt-2">
              <PortableText value={job.jobDescription} components={portableBody} />
            </div>
          </section>
        )}
        {job.profile && job.profile.length > 0 && (
          <section>
            <h2 className="text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60">
              Your profile
            </h2>
            <div className="mt-2">
              <PortableText value={job.profile} components={portableBody} />
            </div>
          </section>
        )}
        {job.offer && job.offer.length > 0 && (
          <section>
            <h2 className="text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60">
              What we offer
            </h2>
            <div className="mt-2">
              <PortableText value={job.offer} components={portableBody} />
            </div>
          </section>
        )}
      </div>

      {job.contact && (
        <div className="px-[clamp(24px,5vw,72px)] pb-[clamp(80px,10vw,160px)]">
          <div className="flex max-w-2xl flex-col gap-2 border-t border-brigada-black/10 pt-[clamp(28px,3vw,42px)]">
            <p className="text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60">
              Questions about this role?
            </p>
            <p className="mt-2 text-[clamp(18px,1.4vw,22px)] font-medium">
              {job.contact.name}
            </p>
            {job.contact.position && (
              <p className="text-brigada-black/70">{job.contact.position}</p>
            )}
            <div className="mt-2 space-y-1 text-[clamp(14px,1.1vw,16px)]">
              {job.contact.email && (
                <a
                  href={`mailto:${job.contact.email}`}
                  className="block transition-opacity hover:opacity-60"
                >
                  {job.contact.email}
                </a>
              )}
              {job.contact.phone && (
                <a
                  href={`tel:${job.contact.phone.replace(/\s/g, "")}`}
                  className="block text-brigada-black/70 transition-opacity hover:opacity-60"
                >
                  {job.contact.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {job.form && formFields.length > 0 && (
        <section
          id="apply"
          className="border-t border-brigada-black/10 px-[clamp(24px,5vw,72px)] py-[clamp(80px,10vw,160px)]"
        >
          <div className="max-w-3xl">
            <p className="text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60">
              Apply
            </p>
            <h2 className="font-display mt-4 text-[clamp(28px,4vw,56px)] leading-[1.1] tracking-[-0.01em]">
              Apply for {job.name}
            </h2>
            {formIntro && (
              <p className="mt-[clamp(16px,1.4vw,24px)] text-[clamp(16px,1.3vw,20px)] leading-[1.5] text-brigada-black/70">
                {formIntro}
              </p>
            )}

            <div className="mt-[clamp(36px,4vw,56px)]">
              {sent ? (
                <p className="text-[clamp(18px,1.6vw,24px)] leading-[1.5]">{successMessage}</p>
              ) : (
                <form
                  onSubmit={onSubmit}
                  className="grid grid-cols-1 gap-y-[clamp(28px,3vw,40px)] sm:grid-cols-2 sm:gap-x-[clamp(20px,2vw,32px)]"
                >
                  {formFields.map((f, i) => {
                    const fieldName = f.name ?? `f${i}`;
                    const colSpan = f.span === "half" ? "sm:col-span-1" : "sm:col-span-2";
                    return (
                      <div key={f._key ?? fieldName} className={colSpan}>
                        <label
                          htmlFor={fieldName}
                          className="mb-3 block text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60"
                        >
                          {f.label}
                          {f.required ? " *" : ""}
                        </label>
                        {f.type === "textarea" ? (
                          <textarea
                            id={fieldName}
                            name={fieldName}
                            rows={5}
                            required={f.required ?? false}
                            placeholder={f.placeholder ?? ""}
                            className={`${inputClass} resize-none`}
                          />
                        ) : f.type === "select" ? (
                          <select
                            id={fieldName}
                            name={fieldName}
                            required={f.required ?? false}
                            className={inputClass}
                          >
                            <option value="">{f.placeholder ?? "Select…"}</option>
                            {(f.options ?? []).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : f.type === "file" ? (
                          <input
                            id={fieldName}
                            name={fieldName}
                            type="file"
                            required={f.required ?? false}
                            accept=".pdf,.doc,.docx"
                            className={`${inputClass} pb-2 file:mr-4 file:border-0 file:bg-transparent file:text-[clamp(13px,1vw,15px)] file:uppercase file:tracking-[0.1em]`}
                          />
                        ) : (
                          <input
                            id={fieldName}
                            name={fieldName}
                            type={f.type ?? "text"}
                            required={f.required ?? false}
                            placeholder={f.placeholder ?? ""}
                            autoComplete="off"
                            className={inputClass}
                          />
                        )}
                      </div>
                    );
                  })}
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="group flex items-center gap-2 bg-brigada-black px-[clamp(32px,3vw,48px)] py-[clamp(16px,1.4vw,20px)] text-[clamp(13px,1.05vw,15px)] uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-80"
                    >
                      <span>{submitLabel}</span>
                      <span className="relative top-[-1px] inline-block transition-transform duration-300 ease-out group-hover:translate-x-1">
                        →
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default JobDetail;
