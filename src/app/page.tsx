import Link from "next/link";
import { getSession } from "@/lib/auth";
import { signupEnabled } from "@/lib/flags";

const primaryBtn =
  "rounded-md bg-foreground px-6 py-3 font-medium text-background";

const FEATURES = [
  {
    icon: "🔗",
    title: "Tu página de reservas",
    body: "Un link para Instagram o WhatsApp: tus clientes reservan solos, sin llamarte.",
  },
  {
    icon: "📅",
    title: "Agenda multi-barbero",
    body: "Cada barbero ve su día desde el celular; tú ves todo el negocio.",
  },
  {
    icon: "⏰",
    title: "Recordatorios automáticos",
    body: "Email horas antes de la cita, sin que tengas que acordarte de avisar.",
  },
  {
    icon: "📊",
    title: "Reportes al día",
    body: "Ingresos y citas por barbero, exportables a CSV cuando quieras.",
  },
];

export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-16 px-6 py-16">
      <section className="flex flex-col items-center gap-6 text-center">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide opacity-60">
          <span className="text-lg">💈</span> BarberDesk
        </p>
        <h1 className="text-4xl font-bold sm:text-5xl">
          Agenda de barbería, sin llamadas ni WhatsApp perdido
        </h1>
        <p className="max-w-xl text-lg opacity-70">
          Una página de reservas propia, agenda multi-barbero y recordatorios
          automáticos — para que tus clientes reserven solos y no se te
          olvide avisarles.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          {session?.user ? (
            <Link href="/select-tenant" className={primaryBtn}>
              Ir a mis barberías
            </Link>
          ) : signupEnabled ? (
            <>
              <Link href="/signup" className={primaryBtn}>
                Crea tu barbería gratis
              </Link>
              <Link href="/login" className="text-sm underline opacity-70">
                Ya tengo cuenta
              </Link>
            </>
          ) : (
            <Link href="/login" className={primaryBtn}>
              Entrar
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="flex flex-col gap-1.5 rounded-lg border border-black/10 p-5 dark:border-white/15"
          >
            <p className="text-2xl">{f.icon}</p>
            <p className="font-semibold">{f.title}</p>
            <p className="text-sm opacity-70">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
