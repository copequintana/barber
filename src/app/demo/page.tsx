import Image from "next/image";
import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Play,
  QrCode,
  Scissors,
  Smartphone,
  Store,
  Trash2,
} from "lucide-react";
import { SubmitButton } from "@/components/admin/submit-button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { CopyButton } from "@/components/copy-button";
import { Notice } from "@/components/notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import {
  DEMO_TENANT_NAME,
  DEMO_TTL_HOURS,
  demoBarberCredentials,
  getActiveDemo,
  purgeExpiredDemos,
  remainingLabel,
} from "@/lib/demo";
import { appBaseUrl } from "@/lib/notifications";
import { requireVendor } from "@/lib/platform-guard";
import { finishDemo, logoutVendor, openDemoAdmin, startDemo } from "./actions";

export const metadata = { title: "Demo · BarberDesk" };

const INCLUDED = [
  { icon: Scissors, text: "3 barberos con horario y 5 servicios con precio" },
  { icon: CalendarCheck, text: "Citas de las últimas 2 semanas y de los próximos días" },
  { icon: Store, text: "Página de reservas lista para reservar en vivo" },
  { icon: Smartphone, text: "Acceso de barbero para enseñar su panel en otro teléfono" },
];

const SCRIPT = [
  "Abre la página de reservas en el teléfono del dueño y reserva una cita.",
  "Entra al panel del dueño: la cita ya aparece en la agenda de hoy.",
  "Muéstrale Reportes y cambia el tema en Configuración para que vea su estilo.",
  "Termina la demo al despedirte. Si se te olvida, se borra sola.",
];

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ ended?: string }>;
}) {
  const vendor = await requireVendor();
  const { ended } = await searchParams;
  await purgeExpiredDemos();
  const demo = await getActiveDemo(vendor.id);
  const ownTenants = await prisma.membership.count({
    where: { userId: vendor.id, tenant: { isDemo: false } },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-mark.png" alt="" width={28} height={28} />
          <span className="font-semibold tracking-tight">BarberDesk</span>
          <Badge variant="secondary">Demo de ventas</Badge>
        </Link>
        <div className="flex items-center gap-2">
          {ownTenants > 0 ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/select-tenant">Mis barberías</Link>
            </Button>
          ) : null}
          <form action={logoutVendor}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut /> Salir
            </Button>
          </form>
        </div>
      </header>

      {ended ? (
        <Notice tone="success">Demo terminada: se borró la barbería de ejemplo con todas sus citas.</Notice>
      ) : null}

      {demo ? <ActiveDemo demo={demo} /> : <StartDemo email={vendor.email} />}
    </main>
  );
}

function StartDemo({ email }: { email: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Enséñale BarberDesk con una barbería de verdad</CardTitle>
        <CardDescription>
          Creamos {DEMO_TENANT_NAME}, una barbería de ejemplo completa, solo para tu presentación.
          Sesión: {email}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 sm:grid-cols-2">
          {INCLUDED.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3 border-t py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-muted-foreground">
          <Clock className="size-4 shrink-0" />
          Se borra sola a las {DEMO_TTL_HOURS} horas o cuando la termines.
        </p>
        <form action={startDemo}>
          <SubmitButton size="lg" className="w-full sm:w-auto" pendingLabel="Preparando la barbería…">
            <Play /> Iniciar demo
          </SubmitButton>
        </form>
      </CardFooter>
    </Card>
  );
}

function ActiveDemo({
  demo,
}: {
  demo: { id: string; name: string; slug: string; demoExpiresAt: Date | null };
}) {
  const base = appBaseUrl();
  const publicUrl = `${base}/b/${demo.slug}`;
  const loginUrl = `${base}/login`;
  const barber = demoBarberCredentials(demo);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{demo.name} está lista</h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4 shrink-0" />
          Se borra sola en {remainingLabel(demo.demoExpiresAt)}, o antes si la terminas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StepNumber n={1} /> Lo que ven sus clientes
          </CardTitle>
          <CardDescription>
            Abre la página en el teléfono del dueño y reserva una cita en vivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="rounded-lg bg-muted px-3 py-2 font-mono text-sm break-all">{publicUrl}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={`/b/${demo.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Abrir página de reservas
              </a>
            </Button>
            <CopyButton value={publicUrl} />
            <Button asChild variant="outline">
              <a href={`/b/${demo.slug}/qr`} target="_blank" rel="noopener noreferrer">
                <QrCode /> Ver QR
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StepNumber n={2} /> Panel del dueño
          </CardTitle>
          <CardDescription>
            Agenda, barberos, servicios, reportes y el tema de su página. Entras como dueño de la demo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={openDemoAdmin}>
            <SubmitButton pendingLabel="Abriendo…">
              <LayoutDashboard /> Abrir panel del dueño
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StepNumber n={3} /> Panel del barbero
          </CardTitle>
          <CardDescription>
            Entra en otro teléfono o en una ventana privada como Chuy, que tiene citas hoy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y rounded-lg border">
            <CredentialRow label="Página" value={loginUrl} copyLabel="Copiar" copied="Enlace copiado" />
            <CredentialRow label="Correo" value={barber.email} copyLabel="Copiar" copied="Correo copiado" />
            <CredentialRow
              label="Contraseña"
              value={barber.password}
              copyLabel="Copiar"
              copied="Contraseña copiada"
            />
          </dl>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Guion sugerido</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-muted-foreground">
            {SCRIPT.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-xl border border-danger/25 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Terminar demo</p>
          <p className="text-sm text-muted-foreground">
            Borra la barbería de ejemplo, sus citas y el acceso del barbero.
          </p>
        </div>
        <form action={finishDemo}>
          <ConfirmSubmit
            title="¿Terminar la demo?"
            description="Se borran la barbería de ejemplo, sus citas y el acceso del barbero. Puedes iniciar otra cuando quieras."
            confirmLabel="Sí, terminar"
            pendingLabel="Borrando…"
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-danger/30 px-3 text-sm font-medium text-danger hover:bg-danger-soft sm:w-auto"
          >
            <Trash2 className="size-4" /> Terminar demo
          </ConfirmSubmit>
        </form>
      </div>
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
      {n}
    </span>
  );
}

function CredentialRow({
  label,
  value,
  copyLabel,
  copied,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copied: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-mono text-sm break-all">{value}</dd>
      </div>
      <CopyButton value={value} label={copyLabel} copiedMessage={copied} size="sm" variant="ghost" />
    </div>
  );
}
