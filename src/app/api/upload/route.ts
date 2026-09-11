import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { Role } from "@prisma/client";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getMembership } from "@/lib/tenancy";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_ROLES: Role[] = ["owner", "admin"];

const payloadSchema = z.object({ tenantId: z.string().uuid() });

/**
 * Emite el permiso de subida que el navegador usa para mandar el archivo
 * directo a Vercel Blob (sin pasar por esta función, así no choca con el
 * límite de tamaño de las funciones serverless). No persiste nada: quien
 * llama guarda la URL resultante con setTenantImage() en cuanto termina.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayloadRaw) => {
        const session = await getSession();
        if (!session?.user) throw new Error("No has iniciado sesión");

        const parsed = payloadSchema.safeParse(
          clientPayloadRaw ? JSON.parse(clientPayloadRaw) : null,
        );
        if (!parsed.success) throw new Error("Datos de subida inválidos");

        const membership = await getMembership(session.user.id, parsed.data.tenantId);
        if (!membership || !ALLOWED_ROLES.includes(membership.role)) {
          throw new Error("No autorizado");
        }

        return {
          allowedContentTypes: IMAGE_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo subir el archivo" },
      { status: 400 },
    );
  }
}
