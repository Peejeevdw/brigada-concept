import Legal, { type LegalData } from "@/views/Legal";
import { getLegalPage } from "@/lib/sanity-fetch";

export default async function PrivacyPage() {
  const data = (await getLegalPage("privacy")) as LegalData;
  return <Legal kind="privacy" data={data} />;
}
