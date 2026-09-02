import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ejecuta `fn` dentro de una transacción con `app.tenant_id` seteado,
 * de modo que las policies de RLS filtren toda query al tenant dado.
 *
 * Toda lectura/escritura de tablas de negocio DEBE pasar por aquí:
 * fuera de este contexto, RLS no devuelve filas (deny por defecto).
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!UUID_RE.test(tenantId)) {
    throw new Error(`tenantId inválido: ${tenantId}`);
  }
  return prisma.$transaction(async (tx) => {
    // set_config(..., true) = local a la transacción: no se filtra a otras
    // conexiones del pool.
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}

/** Error de Postgres cuando el constraint EXCLUDE anti-solape rechaza la cita. */
export function isOverlapError(error: unknown): boolean {
  const message =
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
      ? error.message
      : error instanceof Error
        ? error.message
        : "";
  return message.includes("appointments_no_overlap");
}
