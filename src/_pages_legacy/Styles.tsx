import { Link } from "react-router-dom";

type Sample = {
  name: string;
  className: string;
  description: string;
  sample: string;
  css: string;
};

const samples: Sample[] = [
  {
    name: "font-hero",
    className: "font-hero",
    description: 'Big hero title (e.g. "Meet the clients" on /work).',
    sample: "Sharp beats loud",
    css: `font-family: "Antarctica", system-ui, sans-serif;
font-variation-settings: "wdth" 125, "wght" 500;
font-weight: 500;
text-transform: uppercase;
line-height: 0.95;
letter-spacing: -0.015em;
font-size: clamp(1.75rem, 2.5vw, 3rem); /* 48pt @ 1920 */`,
  },
  {
    name: "font-big-title",
    className: "font-big-title",
    description: "Big title, sits between font-hero and font-title.",
    sample: "Big title style",
    css: `font-family: "Antarctica", system-ui, sans-serif;
font-weight: 450;
font-variation-settings: "wdth" 100, "wght" 450, "ital" 0, "CONT" 0;
font-size: clamp(1.875rem, 2.7083vw, 3.25rem); /* 52px @ 1920 */
line-height: 1;
letter-spacing: -0.015em;
text-transform: none;`,
  },
  {
    name: "font-title",
    className: "font-title",
    description: 'Title for case labels (e.g. "BMW" under work thumbs).',
    sample: "Selected work",
    css: `font-family: "Antarctica", system-ui, sans-serif;
font-variation-settings: "wdth" 125, "wght" 500;
font-weight: 500;
font-size: clamp(1.25rem, 1.875vw, 2.25rem); /* 36px @ 1920 */
line-height: 1;
text-transform: uppercase;`,
  },
  {
    name: "font-nav",
    className: "font-nav",
    description: 'Navigation items and eyebrow labels (e.g. "WORK" above the hero title).',
    sample: "About . Work . Contact",
    css: `font-family: "Antarctica", system-ui, sans-serif;
font-weight: 400;
font-size: 0.875rem;
line-height: 1.25rem;
text-transform: uppercase;
letter-spacing: 0.1em;`,
  },
  {
    name: "font-body",
    className: "font-body",
    description: "Primary reading copy used for paragraphs on the homepage.",
    sample:
      "When strategy, creativity, data and experience come together from day one, great work happens.",
    css: `font-family: "Antarctica", system-ui, sans-serif;
font-weight: 400;
font-variation-settings: "wdth" 100, "wght" 400, "ital" 0, "CONT" 0;
font-size: clamp(1rem, 1.25vw, 1.5rem); /* 24px @ 1920 */
line-height: 1.2;
letter-spacing: -0.015em;
text-transform: none;`,
  },
  {
    name: "font-meta",
    className: "font-meta",
    description: "Footer addresses, sitemap, legal links.",
    sample: "Brussels . Antwerp . Amsterdam",
    css: `font-family: "Antarctica", system-ui, sans-serif;
font-weight: 400;
font-size: clamp(0.75rem, 1.0417vw, 1.25rem); /* 20px @ 1920 */
line-height: 1.375;
letter-spacing: -0.015em;`,
  },
];


const Styles = () => {
  return (
    <main className="min-h-screen bg-[#f3f2ef] text-[#2D2928] px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 pt-32 md:pt-40 pb-24">
      <header className="mb-16 md:mb-24 grid grid-cols-1 md:grid-cols-6 gap-3 md:gap-5">
        <p className="font-nav md:col-span-2">Styles</p>
        <h1 className="font-hero md:col-span-4">Type system</h1>
        <p className="font-body md:col-span-4 md:col-start-3 mt-4">
          Every typographic role used across the site, with a live sample, the
          utility class to apply it, and its exact CSS settings.
        </p>
      </header>

      <section className="flex flex-col gap-12 md:gap-16">
        {samples.map((s) => (
          <article
            key={s.name}
            className="grid grid-cols-1 md:grid-cols-6 gap-3 md:gap-5 border-t border-[#2D2928]/15 pt-6 md:pt-8"
          >
            <div className="md:col-span-2 flex flex-col gap-3">
              <code className="font-meta opacity-80">.{s.name}</code>
              <p className="font-description opacity-70">{s.description}</p>
              <pre className="font-meta whitespace-pre-wrap opacity-70 text-[12px] leading-[1.5] bg-[#2D2928]/5 rounded p-3 mt-2">
                {s.css}
              </pre>
            </div>
            <div className="md:col-span-4">
              <p className={s.className}>{s.sample}</p>
            </div>
          </article>
        ))}

        <article className="grid grid-cols-1 md:grid-cols-6 gap-3 md:gap-5 border-t border-[#2D2928]/15 pt-6 md:pt-8">
          <div className="md:col-span-2 flex flex-col gap-3">
            <code className="font-meta opacity-80">Brigada Serif</code>
            <p className="font-description opacity-70">
              Display serif used for the "Brigada" wordmark in the hero. Applied
              directly via font-family, no utility class.
            </p>
            <pre className="font-meta whitespace-pre-wrap opacity-70 text-[12px] leading-[1.5] bg-[#2D2928]/5 rounded p-3 mt-2">
{`font-family: "Brigada Serif", serif;
font-size: clamp(3rem, 9vw, 8rem);
line-height: 0.95;
letter-spacing: -0.03em;`}
            </pre>
          </div>
          <div className="md:col-span-4">
            <p
              className="leading-[0.95]"
              style={{
                fontFamily: '"Brigada Serif", serif',
                fontSize: "clamp(3rem, 9vw, 8rem)",
                letterSpacing: "-0.03em",
              }}
            >
              Brigada
            </p>
          </div>
        </article>
      </section>

      <footer className="mt-24">
        <Link to="/" className="font-nav link-cta">
          (Back home)
        </Link>
      </footer>
    </main>
  );
};

export default Styles;
