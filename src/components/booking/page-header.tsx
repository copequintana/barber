import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BookingHeader({
  backHref,
  backLabel,
  eyebrow,
  title,
  children,
}: {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex items-start gap-3">
      <Link
        href={backHref}
        aria-label={backLabel}
        className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border bg-card hover:bg-muted"
      >
        <ArrowLeft className="size-4" />
      </Link>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="eyebrow truncate">{eyebrow}</p>
        <h1 className="title-lg">{title}</h1>
        {children}
      </div>
    </header>
  );
}
