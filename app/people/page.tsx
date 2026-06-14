import People from "@/views/People";
import { getServiceCategory } from "@/lib/sanity-fetch";
import type { ServiceCategoryDoc, WorkListItem } from "@/views/pillar-types";

export default async function PeoplePage() {
  const data = await getServiceCategory("people");
  return (
    <People
      category={(data?.category as ServiceCategoryDoc | null) ?? null}
      cases={(data?.cases as WorkListItem[] | null) ?? null}
    />
  );
}
