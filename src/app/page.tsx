import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock,
  Link2,
  MessageCircle,
  Palette,
  Scissors,
  Search,
  Smartphone,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { signupEnabled } from "@/lib/flags";
import { appBaseUrl } from "@/lib/notifications";
import { demoRequestUrl } from "@/lib/sales-contact";

const TITLE = "BarberDesk · Agenda y reservas en línea para barberías";
const DESCRIPTION =
  "Tu página de reservas, agenda para todo el equipo, recordatorios automáticos y reportes. Tus clientes reservan solos y tú te dedicas a cortar.";

export function generateMetadata(): Metadata {
  const origin = appBaseUrl();
  return {
    title: TITLE,
    description: DESCRIPTION,
    openGraph: { title: TITLE, description: DESCRIPTION, type: "website", url: origin, images: [`${origin}/landing/og.jpg`] },
  };
}

const FEATURES = [
  { icon: Link2, title: "Tu página de reservas", body: "Un link para Instagram o WhatsApp: tus clientes reservan solos, sin llamarte." },
  { icon: Palette, title: "Con tu estilo", body: "Elige entre ocho temas y tu color de marca para que la página se vea como tu local." },
  { icon: CalendarDays, title: "Agenda multi-barbero", body: "Tú ves todo el negocio por día o por semana; mueves y cancelas citas en segundos." },
  { icon: Smartphone, title: "Cada barbero, su día", body: "Desde el celular ve sus citas, llama o escribe al cliente y marca cómo salió cada una." },
  { icon: Clock, title: "Recordatorios automáticos", body: "Avisos antes de la cita para que tus clientes no se olviden y bajen las faltas." },
  { icon: BarChart3, title: "Reportes al día", body: "Ingresos, ocupación y servicios más pedidos, exportables a CSV cuando quieras." },
];

function BrowserFrame({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-[0_24px_60px_-28px_rgb(0_0_0/0.35)]">
      <div className="flex h-7 items-center gap-1.5 border-b bg-muted px-3" aria-hidden>
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="size-2.5 rounded-full bg-foreground/15" />
      </div>
      <Image src={src} alt={alt} width={1600} height={1008} priority={priority} unoptimized className="h-auto w-full" />
    </div>
  );
}

function PhoneFrame({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[1.6rem] border-[5px] border-foreground/85 bg-card shadow-[0_24px_50px_-20px_rgb(0_0_0/0.45)] ${className ?? ""}`}>
      <Image src={src} alt={alt} width={720} height={1558} unoptimized className="h-auto w-full" />
    </div>
  );
}

export default async function HomePage() {
  const [session, h] = await Promise.all([getSession(), headers()]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "barberdesk.net";
  const demoUrl = demoRequestUrl();
  const signedIn = Boolean(session?.user);

  const steps = [
    { title: "Pide tu demo", body: "Escríbenos por WhatsApp y acordamos un horario." },
    { title: "Te la mostramos", body: "En tu celular, con una barbería de ejemplo: reservar, ver la agenda y el panel de cada barbero." },
    signupEnabled
      ? { title: "Crea tu barbería", body: "Das de alta tus servicios, barberos y horario, y compartes tu link de reservas ese mismo día." }
      : { title: "Damos de alta tu barbería", body: "Te llega un correo para crear tu contraseña y compartes tu link de reservas ese mismo día." },
  ];

  const primary = signedIn ? (
    <Button asChild size="lg">
      <Link href="/select-tenant">Ir a mis barberías</Link>
    </Button>
  ) : demoUrl ? (
    <Button asChild size="lg">
      <a href={demoUrl} target="_blank" rel="noopener noreferrer">
        <MessageCircle /> Pide tu demo
      </a>
    </Button>
  ) : signupEnabled ? (
    <Button asChild size="lg">
      <Link href="/signup">Crea tu barbería</Link>
    </Button>
  ) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <BrandMark priority />
            <span className="font-semibold tracking-tight">BarberDesk</span>
          </Link>
          <div className="flex items-center gap-1">
            <Button asChild variant="outline" size="sm">
              <Link href="/directorio" aria-label="Buscar una barbería">
                <Search />
                <span className="hidden sm:inline">Buscar una barbería</span>
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={signedIn ? "/select-tenant" : "/login"}>{signedIn ? "Mis barberías" : "Entrar"}</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:pt-16 lg:pb-24">
          <div className="flex flex-col items-start gap-5">
            <p className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">Para dueños de barbería</p>
            <h1 className="text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl">
              Tu agenda de barbería, sin llamadas ni WhatsApp perdido
            </h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">
              Una página de reservas propia, agenda para todo tu equipo y recordatorios automáticos. Tus clientes reservan solos y tú te dedicas a
              cortar.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {primary}
              {!signedIn ? (
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Ya tengo cuenta</Link>
                </Button>
              ) : null}
            </div>
            <Link
              href="/directorio"
              className="group mt-2 flex w-full max-w-md items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left shadow-card transition-colors hover:border-primary/40"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Scissors className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">¿Vienes a cortarte el pelo?</span>
                <span className="block text-sm text-muted-foreground">Busca una barbería cerca de ti y reserva.</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="relative pr-10 pb-12 sm:pr-16">
            <BrowserFrame src="/landing/agenda.webp" alt="Agenda del día con las citas de dos barberos" priority />
            <PhoneFrame src="/landing/reservas.webp" alt="Página de reservas de una barbería en el celular" className="absolute right-0 bottom-0 w-28 sm:w-40" />
          </div>
        </section>

        <section className="border-y bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight text-balance">Todo lo que necesita tu barbería</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">De la reserva del cliente a los números del día.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex flex-col gap-2 rounded-xl border bg-card p-5 shadow-card">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto flex max-w-6xl flex-col gap-20 px-4 py-20 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h2 className="text-3xl font-semibold tracking-tight text-balance">Tus clientes reservan solos, a cualquier hora</h2>
              <p className="text-muted-foreground">
                Tu página con tus servicios, precios y barberos. El cliente elige su hora, recibe la confirmación y puede mover o cancelar su cita
                desde su enlace, sin llamarte.
              </p>
              <p className="font-num w-fit rounded-lg border bg-muted px-3 py-2 text-sm">{host}/b/tu-barberia</p>
            </div>
            <div className="flex justify-center gap-4 sm:gap-6">
              <PhoneFrame src="/landing/horario.webp" alt="El cliente elige día y hora para su cita" className="w-36 sm:w-52" />
              <PhoneFrame src="/landing/cita.webp" alt="Confirmación de la cita con opciones para cambiarla o cancelarla" className="mt-10 w-36 sm:w-52" />
            </div>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="flex flex-col gap-3 lg:order-2">
              <h2 className="text-3xl font-semibold tracking-tight text-balance">Tú ves todo el negocio; cada barbero, su día</h2>
              <p className="text-muted-foreground">
                En tu panel ves las citas de hoy, lo que falta por marcar y los ingresos esperados. Cada barbero abre su día en el celular, llama o
                escribe al cliente y marca cómo salió cada cita.
              </p>
            </div>
            <div className="relative pr-10 pb-12 sm:pr-16 lg:order-1">
              <BrowserFrame src="/landing/inicio.webp" alt="Panel del dueño con las citas de hoy e ingresos esperados" />
              <PhoneFrame src="/landing/barbero.webp" alt="Panel de un barbero en el celular con sus citas del día" className="absolute right-0 bottom-0 w-28 sm:w-40" />
            </div>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h2 className="text-3xl font-semibold tracking-tight text-balance">Reportes al día</h2>
              <p className="text-muted-foreground">
                Ingresos, ocupación por barbero, faltas y servicios más pedidos del periodo que elijas. Exporta a CSV cuando quieras.
              </p>
            </div>
            <BrowserFrame src="/landing/reportes.webp" alt="Reportes con citas, ingresos, ocupación por barbero y servicios más pedidos" />
          </div>
        </section>

        <section className="border-t bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight text-balance">Cómo empezamos</h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="flex flex-col gap-2 rounded-xl border bg-card p-5 shadow-card">
                  <span className="font-num flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Te lo mostramos funcionando en tu celular</h2>
          <p className="text-muted-foreground">Reservas, agenda, recordatorios y reportes en un solo lugar.</p>
          {primary}
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <span>© {new Date().getFullYear()} BarberDesk</span>
          <div className="flex items-center gap-4">
            <Link href="/directorio" className="hover:text-foreground">
              Buscar una barbería
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Entrar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
