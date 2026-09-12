"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { FallbackImage } from "./fallback-image";

const ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** El SDK de Blob tira un mensaje técnico en inglés cuando no hay store
 * conectado (BLOB_READ_WRITE_TOKEN ausente); se traduce ese caso puntual. */
function friendlyError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : "";
  if (/token/i.test(message)) {
    return "Falta conectar el almacenamiento de imágenes en Vercel (Storage → Blob). Avisa a quien administra el hosting.";
  }
  return message || fallback;
}

/**
 * Selector de archivo que sube directo del navegador a Vercel Blob (no pasa
 * por nuestro servidor) y persiste la URL resultante llamando a `onUpload`
 * — una server action (o un .bind() sobre una) que decide dónde guardarla:
 * el logo/portada del tenant, la foto de un barbero, etc. Requiere que el
 * proyecto tenga un store de Blob conectado en Vercel — sin eso, /api/upload
 * falla con un error claro en vez de romper la página.
 */
export function ImageUploadField({
  label,
  tenantId,
  currentUrl,
  previewClassName,
  help,
  onUpload,
}: {
  label: string;
  tenantId: string;
  currentUrl: string | null;
  previewClassName: string;
  help?: string;
  onUpload: (url: string | null) => Promise<void>;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite volver a elegir el mismo archivo después
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError(`La imagen pesa más de ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`);
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ tenantId }),
      });
      await onUpload(blob.url);
      router.refresh();
    } catch (err) {
      setError(friendlyError(err, "No se pudo subir la imagen"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setError(null);
    setBusy(true);
    try {
      await onUpload(null);
      router.refresh();
    } catch (err) {
      setError(friendlyError(err, "No se pudo quitar la imagen"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        {currentUrl ? (
          <FallbackImage src={currentUrl} alt="" className={previewClassName} />
        ) : (
          <div
            className={`${previewClassName} flex shrink-0 items-center justify-center rounded-md border border-dashed border-black/15 text-center text-xs opacity-40 dark:border-white/20`}
          >
            Sin imagen
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-white/20"
            >
              {busy ? "Subiendo…" : currentUrl ? "Reemplazar" : "Subir imagen"}
            </button>
            {currentUrl ? (
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy}
                className="text-sm text-red-700 underline disabled:opacity-50 dark:text-red-400"
              >
                Quitar
              </button>
            ) : null}
          </div>
          {help ? <p className="text-xs opacity-60">{help}</p> : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleFile}
      />
      {error ? <p className="text-xs text-red-700 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
