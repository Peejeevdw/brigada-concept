import WorkLab, { type WorkLayoutData } from "@/views/WorkLab";
import { getWorkLayout } from "@/lib/sanity-fetch";

// Layout prototype for the new case-detail design (hero → title bar with a
// "Project info" drawer → gallery). Reads the new case-layout fields from
// Sanity (hero / projectInfo / mediaRows). While no case has them filled in
// yet, the view falls back to its built-in mock so the design stays visible.
export default async function WorkLabPage() {
  const data = (await getWorkLayout()) as WorkLayoutData | null;
  return <WorkLab data={data} />;
}
