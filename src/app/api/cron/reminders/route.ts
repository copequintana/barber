import { NextResponse } from "next/server";
import { runCron } from "@/lib/reminders";

/**
 * Cron de recordatorios y cierre automático (T13/T14).
 * Programar cada 15 min (Vercel Cron, GitHub Actions schedule, etc.).
 * Con CRON_SECRET definido exige `Authorization: Bearer <secret>`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  const stats = await runCron();
  return NextResponse.json(stats);
}
