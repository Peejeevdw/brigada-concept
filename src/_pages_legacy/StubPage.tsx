import { Link } from "react-router-dom";
import Placeholder from "@/components/wireframe/Placeholder";

interface StubPageProps {
  eyebrow?: string;
  title: string;
  intro?: string;
  links?: { to: string; label: string }[];
  placeholderLabel?: string;
}

const StubPage = ({
  eyebrow,
  title,
  intro = "Lorem ipsum placeholder copy for this page section.",
  links,
  placeholderLabel = "CONTENT",
}: StubPageProps) => {
  return (
    <div className="px-6 md:px-10 py-24">
      {eyebrow && (
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-6">
          {eyebrow}
        </p>
      )}
      <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
        {title}
      </h1>
      <p className="max-w-2xl text-lg text-neutral-600 mb-12">{intro}</p>

      {links && (
        <ul className="flex flex-wrap gap-x-8 gap-y-3 mb-12 text-sm uppercase tracking-widest">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="border-b border-neutral-900 pb-1 link-cta"
              >
                {l.label} →
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Placeholder
        label={placeholderLabel}
        shade="light"
        className="aspect-[16/9] w-full"
      />
    </div>
  );
};

export default StubPage;
