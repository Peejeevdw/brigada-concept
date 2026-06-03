import Legal, { type LegalData } from "@/views/Legal";
import { getLegalPage } from "@/lib/sanity-fetch";

export default async function CookiesPage() {
  const data = (await getLegalPage("cookies")) as LegalData;
  return <Legal kind="cookies" data={data} />;
}
