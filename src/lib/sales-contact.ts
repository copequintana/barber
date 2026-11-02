import { normalizePhone } from "./whatsapp/send";

export const DEMO_MESSAGE = "Hola, quiero una demo de BarberDesk para mi barbería";

export function demoRequestUrl(): string | null {
  const phone = normalizePhone(process.env.SALES_WHATSAPP ?? "");
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(DEMO_MESSAGE)}` : null;
}
