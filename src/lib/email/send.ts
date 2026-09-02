import { Resend } from "resend";

/**
 * Transporte de email (T12).
 *
 * Con RESEND_API_KEY definida envía por Resend; sin ella (desarrollo) usa el
 * transporte "consola": imprime el email en el log del servidor y reporta
 * éxito, para que todo el flujo (idempotencia incluida) funcione igual.
 */

export type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
};

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "BarberDesk <onboarding@resend.dev>";

  if (!apiKey) {
    console.log(
      `[email:consola] to=${
        Array.isArray(args.to) ? args.to.join(",") : args.to
      } subject="${args.subject}" (${args.html.length} bytes html)`,
    );
    return { ok: true };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject: args.subject,
      html: args.html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
