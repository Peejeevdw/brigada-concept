import type { Metadata } from "next";
import AgencyPoster from "@/views/AgencyPoster";
import { getOldAgency } from "@/data/oldAgencies";

// /today — the "Today is now Brigada" single-screen poster (no nav / section /
// footer). Promoted from the former /today_1 variant; this explicit route
// supersedes the old multi-section /today (AgencyTransition via the catch-all).
// Reuses the "today" agency record. /today_1 now 301-redirects here.

export function generateMetadata(): Metadata {
  const agency = getOldAgency("today");
  return agency ? { title: `${agency.name} is now Brigada` } : {};
}

export default function TodayPosterPage() {
  return <AgencyPoster slug="today" />;
}
