import About, { type AboutData } from "@/views/About";
import { getAboutPage } from "@/lib/sanity-fetch";

export default async function AboutPage() {
  const data = (await getAboutPage()) as AboutData | null;
  return <About data={data} />;
}
