import { requireTenantRole } from "@/lib/guards";
import { getReportRows } from "@/lib/reports";
import { getTenantById } from "@/lib/tenancy";
import { formatZoned } from "@/lib/time";

/** Export CSV del rango de reportes (T17). */

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const ctx = await requireTenantRole("owner", "admin");
  const tenant = (await getTenantById(ctx.tenantId))!;

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const rows = await getReportRows(ctx.tenantId, tenant.timezone, from, to);
  if (!rows) return new Response("Rango inválido", { status: 400 });

  const header = [
    "fecha_local",
    "cliente",
    "telefono",
    "servicio",
    "barbero",
    "estado",
    "precio",
    "cancelada_por",
  ];
  const lines = [header.join(",")];
  for (const a of rows) {
    lines.push(
      [
        csvCell(formatZoned(tenant.timezone, a.startsAt)),
        csvCell(a.customer.name),
        csvCell(a.customer.phone),
        csvCell(a.service.name),
        csvCell(a.barber.displayName),
        csvCell(a.status),
        csvCell(Number(a.priceAtBooking)),
        csvCell(a.cancelledBy ?? ""),
      ].join(","),
    );
  }

  // BOM para que Excel abra el UTF-8 correctamente
  return new Response(`﻿${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="citas_${from}_${to}.csv"`,
    },
  });
}
