import { cn } from "@/lib/utils";

interface PlaceholderProps {
  label?: string;
  className?: string;
  shade?: "light" | "mid" | "dark";
}

const shades = {
  light: "bg-neutral-100 text-neutral-500 border-neutral-200",
  mid: "bg-neutral-200 text-neutral-600 border-neutral-300",
  dark: "bg-neutral-300 text-neutral-700 border-neutral-400",
};

const Placeholder = ({ label, className, shade = "mid" }: PlaceholderProps) => {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center border overflow-hidden",
        shades[shade],
        className
      )}
    >
      {/* Diagonal lines pattern to read as a wireframe placeholder */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent 0 14px, rgba(0,0,0,0.06) 14px 15px)",
        }}
      />
      {label && (
        <span className="relative text-xs uppercase tracking-widest font-medium">
          {label}
        </span>
      )}
    </div>
  );
};

export default Placeholder;
