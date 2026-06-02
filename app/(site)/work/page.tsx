import { Suspense } from "react";
import Work from "@/views/Work";

export default function WorkPage() {
  return (
    <Suspense fallback={null}>
      <Work />
    </Suspense>
  );
}
