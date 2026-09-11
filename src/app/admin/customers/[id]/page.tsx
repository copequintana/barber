import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db";
import { requireTenantRole } from "@/lib/guards";
import { getTenantById } from "@/lib/tenancy";
import { formatZoned } from "@/lib/time";

export const metadata = { title: "Cliente · BarberDesk" };

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const ctx = await requireTenantRole("owner", "admin");
  const tenant = (await getTenantById(ctx.tenantId))!;
  const { id } = await params;
  const { ok } = await searchParams;

  const customer = await withTenant(ctx.tenantId, (tx) =>
    tx.customer.findUnique({
      where: { id },
      include: {
        appointments: {
          include: { service: true, barber: true },
          orderBy: { startsAt: "desc" },
          take: 50,
        },
      },
    }),
  );
  if (!customer) notFound();

  const noShows = customer.appointments.filter(
    (a) => a.status === "no_show",
  ).length;
  const completed = customer.appointments.filter(
    (a) => a.status === "completed",
  ).length;

  async function saveNotes(formData: FormData) {
    "use server";
    const ctx = await requireTenantRole("owner", "admin");
    const notes = String(formData.get("notes") ?? "")
      .trim()
      .slice(0, 1000);
    await withTenant(ctx.tenantId, (tx) =>
      tx.customer.updateMany({ where: { id }, data: { notes: notes || null } }),
    );
    revalidatePath(`/admin/customers/${id}`);
    redirect(`/admin/customers/${id}?ok=1`);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/admin/agenda" className="text-sm underline opacity-70">
          ← Agenda
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{customer.name}</h1>
        <p className="text-sm opacity-70">
          {customer.phone}
          {customer.email ? ` · ${customer.email}` : ""}
        </p>
      </div>

      {ok ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          Notas guardadas.
        </p>
      ) : null}

      <div className="flex gap-4 text-sm">
        <span>
          <strong className="tabular-nums">{customer.appointments.length}</strong>{" "}
          citas
        </span>
        <span>
          <strong className="tabular-nums">{completed}</strong> completadas
        </span>
        <span className={noShows > 0 ? "text-red-700 dark:text-red-400" : ""}>
          <strong className="tabular-nums">{noShows}</strong> no-shows
        </span>
      </div>

      <form action={saveNotes} className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="notes">
          Notas del cliente (preferencias, alergias, cómo le gusta el corte…)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={1000}
          defaultValue={customer.notes ?? ""}
          className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
        <button
          type="submit"
          className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          Guardar notas
        </button>
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Historial</h2>
        {customer.appointments.length === 0 ? (
          <p className="text-sm opacity-70">Sin citas registradas.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {customer.appointments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/agenda/cita/${a.id}`}
                  className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                >
                  <span className="tabular-nums">
                    {formatZoned(tenant.timezone, a.startsAt)}
                  </span>
                  <span className="mx-2 flex-1 truncate opacity-80">
                    {a.service.name} · {a.barber.displayName}
                  </span>
                  <span className="opacity-70">
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
