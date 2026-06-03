import Contact, { type ContactData } from "@/views/Contact";
import { getContactPage, getChrome } from "@/lib/sanity-fetch";

export default async function ContactPage() {
  const [data, chrome] = await Promise.all([
    getContactPage() as Promise<ContactData | null>,
    getChrome(),
  ]);
  return (
    <Contact
      data={data}
      generalEmail={chrome?.settings?.email ?? ""}
      generalPhone={chrome?.settings?.phone ?? ""}
    />
  );
}
