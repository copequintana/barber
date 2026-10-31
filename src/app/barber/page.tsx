import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { DateTime } from "luxon";
import {
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Phone,
  StickyNote,
  X,
} from "lucide-react";
import { FlashToast } from "@/components/admin/flash-toast";
import { StatusBadge } from "@/components/admin/status-badge";
import { SubmitButton } from "@/components/admin/submit-button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { signOut } from "@/lib/auth";
import { getBarberDay, getOwnBarber } from "@/lib/barber-panel";
import { ACTIVE_TENANT_COOKIE, requireTenantRole } from "@/lib/guards";
import { formatMoney } from "@/lib/money";
import { getTenantById } from "@/lib/tenancy";
import { longDateEs } from "@/lib/time";
import { cn } from "@/lib/utils";
import { markOutcome, removeTimeOff } from "./actions";
import { BarberMenu } from "./barber-menu";
import { BlockSlotSheet } from "./block-slot-sheet";
import { DateJumpInput } from "./date-jump";

export const metadata = { title: "Mi día · BarberDesk" };

type DayData = NonNullable<Awaited<ReturnType<typeof getBarberDay>>>;
type Appointment = DayData["appointments"][number];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
      {children}
    </h2>
  );
}

function isOpen(a: Appointment) {
  return a.status === "confirmed" || a.status === "pending";
}

function zonedTime(d: Date, timezone: string) {
  return DateTime.fromJSDate(d, { zone: "utc" }).setZone(timezone).toFormat("HH:mm");
}

function phoneDigits(raw: string) {
  return raw.replace(/\D/g, "");
}

function AppointmentCard({
  a,
  timezone,
  currency,
  dateISO,
  highlight,
  ask,
}: {
  a: Appointment;
  timezone: string;
  currency: string;
  dateISO: string;
  highlight?: boolean;
  ask?: boolean;
}) {
  const editable = isOpen(a);
  const timeFmt = (d: Date) => zonedTime(d, timezone);
  const money = (amount: number) => formatMoney(amount, currency);
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-card",
        highlight && "border-primary/50 ring-2 ring-primary/20",
        !editable && "opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">{timeFmt(a.startsAt)}</span>
          <span className="text-xs text-muted-foreground">{a.service.durationMin} min</span>
        </p>
        <StatusBadge status={a.status} />
      </div>
      <div>
        <p className="font-medium">{a.customer.name}</p>
        <p className="text-sm text-muted-foreground">
          {a.service.name} · {money(Number(a.priceAtBooking))}
        </p>
        {a.customer.notes ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground">
            <StickyNote className="mt-0.5 size-4 shrink-0" />
            {a.customer.notes}
          </p>
        ) : null}
      </div>
      {ask ? (
        <Notice tone="warning">Terminó a las {timeFmt(a.endsAt)}. ¿Cómo salió?</Notice>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="secondary" size="lg">
          <a href={`tel:${a.customer.phone}`}>
            <Phone /> Llamar
          </a>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <a href={`https://wa.me/${phoneDigits(a.customer.phone)}`} target="_blank" rel="noreferrer">
            <MessageCircle /> WhatsApp
          </a>
        </Button>
        {editable ? (
          <>
            <form action={markOutcome.bind(null, a.id, "completed", dateISO)} className="flex">
              <SubmitButton size="lg" className="w-full" pendingLabel="Marcando…">
                <Check /> Listo
              </SubmitButton>
            </form>
            <form action={markOutcome.bind(null, a.id, "no_show", dateISO)} className="flex">
              <SubmitButton
                size="lg"
                variant="outline"
                className="w-full border-danger/40 text-danger hover:bg-danger-soft hover:text-danger"
                pendingLabel="Marcando…"
              >
                <X /> No vino
              </SubmitButton>
            </form>
          </>
        ) : null}
      </div>
    </li>
  );
}

export default async function BarberHomePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const ctx = await requireTenantRole("barber");
  const tenant = (await getTenantById(ctx.tenantId))!;
  const { date: dateParam } = await searchParams;

  const today = DateTime.now().setZone(tenant.timezone).startOf("day");
  let day = dateParam
    ? DateTime.fromISO(dateParam, { zone: tenant.timezone }).startOf("day")
    : today;
  if (!day.isValid) day = today;
  const dateISO = day.toISODate()!;
  const isToday = day.equals(today);

  async function logout() {
    "use server";
    (await cookies()).delete(ACTIVE_TENANT_COOKIE);
    await signOut({ redirectTo: "/login" });
  }

  const barber = await getOwnBarber(ctx.tenantId, ctx.user.id);
  const data = barber
    ? await getBarberDay(ctx.tenantId, tenant.timezone, barber.id, dateISO)
    : null;

  const timeFmt = (d: Date) => zonedTime(d, tenant.timezone);
  const money = (amount: number) => formatMoney(amount, tenant.currency);

  const nowLocal = DateTime.now().setZone(tenant.timezone);
  const nowMs = nowLocal.toMillis();
  const defaultBlockStart = `${dateISO}T${nowLocal
    .plus({ minutes: 15 - (nowLocal.minute % 15) })
    .toFormat("HH:mm")}`;

  const appointments = data?.appointments ?? [];
  const toMark = appointments.filter((a) => isOpen(a) && a.endsAt.getTime() < nowMs);
  const upcoming = appointments.filter((a) => isOpen(a) && a.endsAt.getTime() >= nowMs);
  const done = appointments.filter((a) => !isOpen(a));
  const next = isToday ? upcoming[0] : undefined;
  const later = next ? upcoming.slice(1) : upcoming;

  const dayTotal = appointments
    .filter((a) => a.status !== "no_show")
    .reduce((sum, a) => sum + Number(a.priceAtBooking), 0);
  const countLabel = `${appointments.length} ${appointments.length === 1 ? "cita" : "citas"}`;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 pt-4 pb-28">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">
            {barber ? barber.displayName : "Mi día"}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{tenant.name}</p>
        </div>
        <BarberMenu
          name={barber?.displayName ?? "Mi día"}
          tenantName={tenant.name}
          logout={logout}
        />
      </header>

      {!barber ? (
        <Notice>
          Tu cuenta no está vinculada a ningún barbero activo de esta
          barbería. Pide al administrador que te vincule desde tu ficha.
        </Notice>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <nav className="flex items-center gap-1 rounded-xl border bg-card p-1.5 shadow-card">
              <Button asChild variant="ghost" size="icon-lg">
                <Link href={`/barber?date=${day.minus({ days: 1 }).toISODate()}`} aria-label="Día anterior">
                  <ChevronLeft />
                </Link>
              </Button>
              <div className="min-w-0 flex-1 text-center">
                <p className="truncate font-semibold">{longDateEs(day)}</p>
                <p className="text-xs text-muted-foreground">
                  {isToday ? "Hoy · " : ""}
                  {countLabel} · {money(dayTotal)}
                </p>
              </div>
              <Button asChild variant="ghost" size="icon-lg">
                <Link href={`/barber?date=${day.plus({ days: 1 }).toISODate()}`} aria-label="Día siguiente">
                  <ChevronRight />
                </Link>
              </Button>
            </nav>
            <div className="flex items-center justify-center gap-3">
              {!isToday ? (
                <Button asChild variant="link" size="sm">
                  <Link href="/barber">Volver a hoy</Link>
                </Button>
              ) : null}
              <DateJumpInput defaultValue={dateISO} />
            </div>
          </div>

          {data && data.timeOff.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {data.timeOff.map((t) => (
                <li
                  key={t.id}
                  className="closed-day flex items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3 text-sm"
                >
                  <span className="flex items-center gap-2 tabular-nums">
                    <Ban className="size-4 shrink-0 text-muted-foreground" />
                    {timeFmt(t.startsAt)}–{timeFmt(t.endsAt)}
                    {t.reason ? <span className="text-muted-foreground">· {t.reason}</span> : null}
                  </span>
                  <form action={removeTimeOff.bind(null, t.id, dateISO)}>
                    <ConfirmSubmit
                      title="¿Quitar este bloqueo?"
                      description={`${timeFmt(t.startsAt)}–${timeFmt(t.endsAt)} volverá a estar disponible para reservas.`}
                      confirmLabel="Sí, quitar"
                      className="text-sm font-medium underline underline-offset-4"
                    >
                      Quitar
                    </ConfirmSubmit>
                  </form>
                </li>
              ))}
            </ul>
          ) : null}

          {appointments.length === 0 ? (
            <Empty className="rounded-xl border border-dashed bg-card/60 py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Check />
                </EmptyMedia>
                <EmptyTitle>Sin citas este día</EmptyTitle>
                <EmptyDescription>
                  Las reservas nuevas aparecen aquí en cuanto se hacen.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {toMark.length > 0 ? (
            <section className="flex flex-col gap-2.5">
              <SectionLabel>Por marcar</SectionLabel>
              <ul className="flex flex-col gap-3">
                {toMark.map((a) => (
                  <AppointmentCard key={a.id} a={a} timezone={tenant.timezone} currency={tenant.currency} dateISO={dateISO} ask />
                ))}
              </ul>
            </section>
          ) : null}

          {next ? (
            <section className="flex flex-col gap-2.5">
              <SectionLabel>Siguiente</SectionLabel>
              <ul className="flex flex-col gap-3">
                <AppointmentCard a={next} timezone={tenant.timezone} currency={tenant.currency} dateISO={dateISO} highlight />
              </ul>
            </section>
          ) : null}

          {later.length > 0 ? (
            <section className="flex flex-col gap-2.5">
              <SectionLabel>{next ? "Más tarde" : "Citas"}</SectionLabel>
              <ul className="flex flex-col gap-3">
                {later.map((a) => (
                  <AppointmentCard key={a.id} a={a} timezone={tenant.timezone} currency={tenant.currency} dateISO={dateISO} />
                ))}
              </ul>
            </section>
          ) : null}

          {done.length > 0 ? (
            <section className="flex flex-col gap-2.5">
              <SectionLabel>Terminadas</SectionLabel>
              <ul className="flex flex-col gap-3">
                {done.map((a) => (
                  <AppointmentCard key={a.id} a={a} timezone={tenant.timezone} currency={tenant.currency} dateISO={dateISO} />
                ))}
              </ul>
            </section>
          ) : null}

          <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/90 backdrop-blur-md">
            <div className="mx-auto w-full max-w-md px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <BlockSlotSheet dateISO={dateISO} defaultStart={defaultBlockStart} />
            </div>
          </div>
        </>
      )}

      <Suspense>
        <FlashToast />
      </Suspense>
    </main>
  );
}
