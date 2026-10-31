import { FallbackImage } from "@/components/fallback-image";
import { cn } from "@/lib/utils";

export function BarberAvatar({
  name,
  photoUrl,
  className,
}: {
  name: string;
  photoUrl: string | null;
  className?: string;
}) {
  const initial = (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-muted font-heading text-lg text-ornament ring-1 ring-ornament/50",
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
  if (!photoUrl) return initial;
  return (
    <FallbackImage
      src={photoUrl}
      alt=""
      fallback={initial}
      className={cn("shrink-0 rounded-full object-cover ring-1 ring-ornament/50", className)}
    />
  );
}
