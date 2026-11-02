import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AuthShell({
  title,
  description,
  footer,
  wide,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen w-full items-center justify-center px-4 py-10">
      <div className={cn("flex w-full flex-col gap-6", wide ? "max-w-md" : "max-w-sm")}>
        <Link href="/" className="flex items-center gap-2 self-center">
          <BrandMark />
          <span className="font-semibold tracking-tight">BarberDesk</span>
        </Link>
        <Card className="gap-5 py-6">
          <CardHeader className="px-6">
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </CardHeader>
          <CardContent className="px-6">{children}</CardContent>
        </Card>
        {footer ? (
          <div className="flex flex-col items-center gap-1.5 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </div>
    </main>
  );
}

export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger">
      {children}
    </p>
  );
}
