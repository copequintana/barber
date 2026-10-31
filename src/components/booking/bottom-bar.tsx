import { cn } from "@/lib/utils";

export function BottomBar({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 backdrop-blur-md">
      <div
        className={cn(
          "mx-auto flex w-full max-w-lg flex-col gap-2.5 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export const ctaClass =
  "cta-label flex min-h-12 w-full items-center justify-center gap-2 py-2 text-center rounded-lg bg-brand px-4 text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-60";
