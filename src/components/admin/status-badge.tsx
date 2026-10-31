import { cn } from "@/lib/utils";

export const APPOINTMENT_STATUS: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmada", className: "bg-success-soft text-success" },
  pending: { label: "Pendiente", className: "bg-warning-soft text-warning" },
  completed: { label: "Completada", className: "bg-muted text-muted-foreground" },
  no_show: { label: "No asistió", className: "bg-danger-soft text-danger" },
  cancelled: { label: "Cancelada", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = APPOINTMENT_STATUS[status] ?? { label: status, className: "bg-muted" };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  );
}
