import { Link } from "react-router-dom";
import WorkThumb, { type Pillar } from "@/components/wireframe/WorkThumb";
import { projects as allProjects } from "@/data/projects";
import Appear from "@/components/Appear";

interface WorkProps {
  filterPillar?: Pillar;
  showAllLink?: boolean;
}

const Work = ({ filterPillar, showAllLink = true }: WorkProps) => {
  const source = filterPillar
    ? allProjects.filter((p) => p.pillars.includes(filterPillar))
    : allProjects;

  const ORDER = ["tui", "bmw", "agristo", "politie"];
  const CLIENT_OVERRIDES: Record<string, string> = {
    tui: "TUI",
    bmw: "BMW",
    agristo: "Agristo",
    politie: "Politie",
  };
  const projects = ORDER
    .map((slug) => source.find((p) => p.slug === slug))
    .filter((p): p is typeof allProjects[number] => Boolean(p))
    .map((p) => ({ ...p, client: CLIENT_OVERRIDES[p.slug] ?? p.client }));


  return (
    <section className="relative bg-[#f3f2ef] pt-10 md:pt-16">
      {showAllLink && (
        <div className="px-6 md:px-10">
          <hr className="font-body border-0 border-t border-[#2D2928] m-0 mb-[1.375em]" />
        </div>
      )}
      {showAllLink && (
        <div className="px-6 md:px-10 grid grid-cols-6 gap-3 md:gap-5 items-center mb-4 md:mb-6">
          <div className="col-span-6 md:col-span-2">
            <Appear from="up">
              <p className="font-title text-[#2D2928]">
                Selected work
              </p>
            </Appear>
          </div>
        </div>
      )}

      {/* Mobile: native horizontal scroller. */}
      <div className="md:hidden overflow-x-auto no-scrollbar">
        <div className="flex gap-3 px-6 pb-2 snap-x snap-mandatory">
          {projects.map((p) => (
            <div
              key={p.slug}
              className="shrink-0 snap-start w-[calc((100%-5*0.75rem)*4/6+3*0.75rem)]"
            >
              <WorkTile project={p} />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: same 6-col grid as Work page */}
      <div className="hidden md:block px-6 md:px-10 pb-6 md:pb-8">
        <div className="grid grid-cols-6 gap-3 md:gap-5 gap-y-12 md:gap-y-16 items-start">
          {projects.map((p) => (
            <div key={p.slug} className="col-span-6 md:col-span-3 min-[1800px]:col-span-2">
              <WorkTile project={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

interface WorkTileProps {
  project: typeof allProjects[number];
}

const WorkTile = ({ project: p }: WorkTileProps) => {
  const tagline = p.tagline ?? p.pillars.join(", ");

  const tile = (
    <Appear as="figure" from="up" distance={40} duration={900} threshold={0.12} className="block">
      <div className="relative w-full overflow-hidden aspect-video">
        <WorkThumb
          pillars={p.pillars}
          seed={p.slug}
          fill
          effect={0}
          quadtoneId="brio-four"
          brioPresetId="strong"
          preserveColor
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <figcaption className="mt-4 text-[#2D2928] grid grid-cols-3 gap-x-3 md:gap-x-5">
        <p className="font-title col-span-3">{p.client}</p>
        <p className="font-meta col-span-2">{tagline}</p>
      </figcaption>
    </Appear>
  );

  return p.clickable ? (
    <Link to={`/work/${p.slug}`} className="block">
      {tile}
    </Link>
  ) : (
    <div className="block cursor-default">{tile}</div>
  );
};

export default Work;
