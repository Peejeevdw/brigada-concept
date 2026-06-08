import People from "@/views/People";
import { getService } from "@/lib/sanity-fetch";
import type { PillarService } from "@/views/pillar-types";

export default async function PeoplePage() {
  const data = await getService("people");
  return <People service={(data?.service as PillarService | null) ?? null} />;
}
