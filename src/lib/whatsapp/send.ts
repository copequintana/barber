/**
 * Transporte de WhatsApp (Meta Cloud API, T13).
 *
 * Requiere en el entorno:
 *   WHATSAPP_TOKEN        token permanente del sistema (Meta Business)
 *   WHATSAPP_PHONE_ID     id del número emisor
 *   WHATSAPP_TEMPLATE     nombre de la plantilla aprobada (con 4 variables:
 *                         negocio, servicio+barbero, fecha/hora, link)
 * Sin credenciales (desarrollo) imprime el mensaje en el log y reporta éxito.
 *
 * Nota: los mensajes iniciados por el negocio DEBEN usar plantillas
 * aprobadas por Meta; el registro y la aprobación tardan semanas.
 */

export type WhatsAppReminderArgs = {
  /** Teléfono destino en formato internacional (solo dígitos, ej. 5215512345678) */
  to: string;
  tenantName: string;
  serviceLine: string; // "Corte clásico con Manuel"
  whenText: string;
  citaUrl: string;
};

export type WhatsAppResult = { ok: true } | { ok: false; error: string };

export function whatsappConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_TOKEN &&
      process.env.WHATSAPP_PHONE_ID &&
      process.env.WHATSAPP_TEMPLATE,
  );
}

/** Normaliza un teléfono a dígitos; null si no parece internacionalizable. */
export function normalizePhone(raw: string, defaultCountry = "52"): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `${defaultCountry}${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

export async function sendWhatsAppReminder(
  args: WhatsAppReminderArgs,
): Promise<WhatsAppResult> {
  if (!whatsappConfigured()) {
    console.log(
      `[whatsapp:consola] to=${args.to} "${args.tenantName}: recordatorio ${args.serviceLine}, ${args.whenText} — ${args.citaUrl}"`,
    );
    return { ok: true };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: args.to,
          type: "template",
          template: {
            name: process.env.WHATSAPP_TEMPLATE,
            language: { code: "es_MX" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: args.tenantName },
                  { type: "text", text: args.serviceLine },
                  { type: "text", text: args.whenText },
                  { type: "text", text: args.citaUrl },
                ],
              },
            ],
          },
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
