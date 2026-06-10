import type { Metadata } from "next";
import AgencyPoster from "@/views/AgencyPoster";
import { getOldAgency } from "@/data/oldAgencies";

// Layout variant of /today — the single-screen poster (no nav / section /
// footer). Reuses the "today" agency record.

export function generateMetadata(): Metadata {
  const agency = getOldAgency("today");
  return agency ? { title: `${agency.name} is now Brigada` } : {};
}

export default function TodayPosterPage() {
  return <AgencyPoster slug="today" />;
}
