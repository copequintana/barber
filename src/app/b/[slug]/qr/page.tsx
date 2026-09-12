import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { toString as qrToSvg } from "qrcode";
import { FallbackImage } from "@/components/fallback-image";
import { appBaseUrl } from "@/lib/notifications";
import { getTenantBySlug } from "@/lib/tenancy";
import { PrintButton } from "./print-button";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  return { title: tenant ? `Código QR · ${tenant.name}` : "Código QR" };
}

/**
 * Página pública (sin login a propósito): pensada para dejarse abierta en
 * una pantalla/tablet del local o para imprimirse (Ctrl+P / botón Imprimir).
 * Exigir sesión de admin aquí obligaría a mantener una cuenta logueada en un
 * dispositivo de cara al público, y el contenido (un link a la página
 * pública) ya es público de por sí.
 */
export default async function TenantQrPage({ params }: Props) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const publicUrl = `${appBaseUrl()}/b/${slug}`;
  // Alto nivel de corrección de errores (H, hasta 30% de daño): pensado
  // para imprimirse y pegarse en el mostrador, donde se puede ensuciar o
  // rayar.
  const svg = await qrToSvg(publicUrl, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 2,
    width: 360,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <div className="flex items-center gap-3">
        {tenant.logoUrl ? (
          <FallbackImage
            src={tenant.logoUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-full border border-black/10 object-cover dark:border-white/15"
          />
        ) : null}
        <h1
          className="text-2xl font-bold"
          style={{ color: tenant.brandColor ?? undefined }}
        >
          {tenant.name}
        </h1>
      </div>

      <div
        className="rounded-2xl border-4 p-4"
        style={{ borderColor: tenant.brandColor ?? "var(--brand)" }}
        // El SVG lo genera el servidor a partir del slug del propio tenant
        // (no es contenido de un usuario): es seguro embeberlo directo.
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <div>
        <p className="text-sm opacity-70">Escanea para reservar tu cita</p>
        <a href={publicUrl} className="break-all text-xs underline opacity-50">
          {publicUrl}
        </a>
      </div>

      <PrintButton />
    </main>
  );
}
