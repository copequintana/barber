import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({ size = 28, priority, className }: { size?: number; priority?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <Image src="/logo-mark-light.png" alt="" width={size} height={size} priority={priority} unoptimized className="dark:hidden" />
      <Image src="/logo-mark-dark.png" alt="" width={size} height={size} priority={priority} unoptimized className="hidden dark:block" />
    </span>
  );
}
