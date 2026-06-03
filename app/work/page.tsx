import { Suspense } from "react";
import Work, { type WorkIndexData } from "@/views/Work";
import { getWorkIndex } from "@/lib/sanity-fetch";

export default async function WorkPage() {
  const data = (await getWorkIndex()) as WorkIndexData | null;
  return (
    <Suspense fallback={null}>
      <Work data={data} />
    </Suspense>
  );
}
