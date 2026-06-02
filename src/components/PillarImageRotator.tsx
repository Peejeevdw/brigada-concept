import type { Pillar } from "@/components/wireframe/WorkThumb";
import { projects } from "@/data/projects";
import { caseImages } from "@/data/caseImages";

interface PillarImageRotatorProps {
  pillar: Pillar;
  className?: string;
  profile?: {
    name: string;
    role: string;
    image: string;
  };
  showProfile?: boolean;
}

const PillarImageRotator = ({
  pillar,
  className,
  profile,
  showProfile = false,
}: PillarImageRotatorProps) => {
  const images = projects
    .filter((p) => p.pillars.includes(pillar))
    .map((p) => caseImages[p.slug])
    .filter(Boolean);

  const index = 0;

  if (images.length === 0) return null;

  return (
    <figure className={className}>
      <div className="relative w-full aspect-square overflow-hidden">
        <img
          src={images[index]}
          alt={pillar}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {profile && (
          <img
            src={profile.image}
            alt={profile.name}
            className="absolute inset-0 w-full h-full object-cover grayscale transition-opacity duration-200"
            style={{ opacity: showProfile ? 1 : 0 }}
          />
        )}
      </div>
      {profile && (
        <figcaption
          className="font-nav mt-2 transition-opacity duration-200"
          style={{ opacity: showProfile ? 1 : 0 }}
        >
          {profile.name}, {profile.role}
        </figcaption>
      )}
    </figure>
  );
};

export default PillarImageRotator;
