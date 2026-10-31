import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  Clock,
  Link2,
  MessageCircle,
  Palette,
  Smartphone,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { signupEnabled } from "@/lib/flags";
import { normalizePhone } from "@/lib/whatsapp/send";

export const metadata = {
  title: "Lleva tu barbería a BarberDesk",
  description: "Agenda de barbería, sin llamadas ni WhatsApp perdido.",
};

const FEATURES = [
  {
    icon: Link2,
    title: "Tu página de reservas",
    body: "Un link para Instagram o WhatsApp: tus clientes reservan solos, sin llamarte.",
  },
  {
    icon: Palette,
    title: "Con tu estilo",
    body: "Elige entre ocho temas y tu color de marca para que la página se vea como tu local.",
  },
  {
    icon: CalendarDays,
    title: "Agenda multi-barbero",
    body: "Tú ves todo el negocio por día o por semana; mueves y cancelas citas en segundos.",
  },
  {
    icon: Smartphone,
    title: "Cada barbero, su día",
    body: "Desde el celular ve sus citas, llama o escribe al cliente y marca cómo salió cada una.",
  },
  {
    icon: Clock,
    title: "Recordatorios automáticos",
    body: "Avisos antes de la cita para que tus clientes no se olviden y bajen las faltas.",
  },
  {
    icon: BarChart3,
    title: "Reportes al día",
    body: "Ingresos, ocupación y servicios más pedidos, exportables a CSV cuando quieras.",
  },
];

function demoRequestUrl(): string | null {
  const phone = normalizePhone(process.env.SALES_WHATSAPP ?? "");
  if (!phone) return null;
  const text = "Hola, quiero una demo de BarberDesk para mi barbería";
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/**
 * Landing de ventas para dueños de barbería — a propósito NO enlazada desde
 * ningún lado del sitio público (ver /): se comparte en privado con cada
 * prospecto al que se le quiera rentar la plataforma.
 */
export default async function SociosPage() {
  const session = await getSession();
  const demoUrl = demoRequestUrl();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-14 px-4 py-5 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <Image src="/logo-mark.png" alt="" width={28} height={28} />
          <span className="font-semibold tracking-tight">BarberDesk</span>
        </span>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href={session?.user ? "/select-tenant" : "/login"}>
              {session?.user ? "Mis barberías" : "Entrar"}
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <section className="flex flex-col items-start gap-5 pt-6">
        <p className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          Para dueños de barbería
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Tu agenda de barbería, sin llamadas ni WhatsApp perdido
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Una página de reservas propia, agenda para todo tu equipo y
          recordatorios automáticos. Tus clientes reservan solos y tú te
          dedicas a cortar.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {session?.user ? (
            <Button asChild size="lg">
              <Link href="/select-tenant">Ir a mis barberías</Link>
            </Button>
          ) : demoUrl ? (
            <>
              <Button asChild size="lg">
                <a href={demoUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle /> Pide tu demo
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Ya tengo cuenta</Link>
              </Button>
            </>
          ) : signupEnabled ? (
            <>
              <Button asChild size="lg">
                <Link href="/signup">Crea tu barbería</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Ya tengo cuenta</Link>
              </Button>
            </>
          ) : (
            <Button asChild size="lg">
              <Link href="/login">Entrar</Link>
            </Button>
          )}
        </div>
      </section>

      <section className="grid gap-4 pb-10 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex flex-col gap-2 rounded-xl border bg-card p-5 shadow-card">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <f.icon className="size-5" />
            </span>
            <p className="font-semibold">{f.title}</p>
            <p className="text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
