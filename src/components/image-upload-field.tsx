"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { ImageUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { FallbackImage } from "./fallback-image";

const ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** El SDK de Blob tira un mensaje técnico en inglés cuando no hay store
 * conectado (BLOB_READ_WRITE_TOKEN ausente); se traduce ese caso puntual.
 * Se deja el mensaje original en la consola: el texto amigable no alcanza
 * para diagnosticar si la causa real es otra (ver "token" en la respuesta
 * de Blob por otro motivo, p. ej. CORS o un scope de token distinto). */
function friendlyError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : "";
  if (/token/i.test(message)) {
    console.error("[image-upload] error con 'token' en el mensaje:", err);
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
            className={cn(
              previewClassName,
              "flex shrink-0 items-center justify-center border border-dashed border-border bg-muted text-center text-xs text-muted-foreground",
            )}
          >
            Sin imagen
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {busy ? <Spinner /> : <ImageUp />}
              {busy ? "Subiendo…" : currentUrl ? "Reemplazar" : "Subir imagen"}
            </Button>
            {currentUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={busy}
                className="text-danger hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 /> Quitar
              </Button>
            ) : null}
          </div>
          {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleFile}
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
