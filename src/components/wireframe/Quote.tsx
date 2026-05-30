interface QuoteProps {
  children: React.ReactNode;
  attribution: string;
  role?: string;
}

const Quote = ({ children, attribution, role }: QuoteProps) => {
  return (
    <figure className="px-6 md:px-10 py-24 border-y border-neutral-200 bg-neutral-50">
      <blockquote className="max-w-5xl text-3xl md:text-5xl font-semibold leading-tight tracking-tight">
        &ldquo;{children}&rdquo;
      </blockquote>
      <figcaption className="mt-10 text-xs uppercase tracking-widest text-neutral-500">
        {attribution}
        {role ? <span className="text-neutral-400">, {role}</span> : null}
      </figcaption>
    </figure>
  );
};

export default Quote;
