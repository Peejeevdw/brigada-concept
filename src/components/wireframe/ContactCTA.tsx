import Placeholder from "@/components/wireframe/Placeholder";
import { pillarContacts, type PillarContact } from "@/data/contacts";

interface ContactCTAProps {
  pillar?: PillarContact["pillar"];
  heading?: string;
  intro?: string;
}

const ContactCTA = ({ pillar, heading, intro }: ContactCTAProps) => {
  const contacts = pillar
    ? pillarContacts.filter((c) => c.pillar === pillar)
    : pillarContacts;

  const single = contacts.length === 1;

  return (
    <section className="border-t border-neutral-200 px-6 md:px-10 py-24">
      <div className="max-w-3xl mb-12">
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-6">
          Get in touch
        </p>
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">
          {heading ?? (single ? `Talk to our ${contacts[0].pillar} lead` : "Talk to a practice lead")}
        </h2>
        <p className="text-lg text-neutral-600">
          {intro ?? "Real people, ready to help. Reach out directly to the lead for the practice you need."}
        </p>
      </div>

      <div className={single ? "max-w-md" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"}>
        {contacts.map((c) => (
          <div key={c.pillar} className="border border-neutral-200 p-6 flex flex-col gap-4">
            <Placeholder label="PORTRAIT" shade="light" className="aspect-square w-full" />
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500 mb-1">
                {c.pillar}
              </p>
              <p className="text-lg font-semibold">{c.name}</p>
              <p className="text-sm text-neutral-600 mb-4">{c.role}</p>
              <div className="space-y-1 text-sm">
                <p>{c.email}</p>
                <p className="text-neutral-600">{c.phone}</p>
              </div>
            </div>
            <a
              href={`mailto:${c.email}`}
              className="self-start text-sm uppercase tracking-widest border-b border-neutral-900 pb-1 link-cta"
            >
              Email →
            </a>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ContactCTA;
