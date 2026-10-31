import { cn } from "@/lib/utils";

const TONES = {
  success: "border-success/25 bg-success-soft text-success",
  warning: "border-warning/25 bg-warning-soft text-warning",
  danger: "border-danger/25 bg-danger-soft text-danger",
  neutral: "border-border bg-muted text-foreground",
} as const;

export function Notice({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof TONES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn("rounded-lg border px-3.5 py-2.5 text-sm", TONES[tone], className)}
    >
      {children}
    </div>
  );
}
