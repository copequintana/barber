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

const TENANT_MODELS = new Set([
  "Barber",
  "Service",
  "BarberService",
  "WorkingHour",
  "TimeOff",
  "Customer",
  "Appointment",
  "Notification",
]);

type Data = Record<string, unknown>;

export class TenantMismatchError extends Error {}

function scopeData(data: Data, tenantId: string): Data {
  if ("tenantId" in data) {
    if (data.tenantId !== tenantId) {
      throw new TenantMismatchError("tenantId distinto al de la barbería activa");
    }
    return data;
  }
  return "tenant" in data ? data : { ...data, tenantId };
}

function scopeArgs(operation: string, args: Data | undefined, tenantId: string): Data {
  const scoped: Data = { ...(args ?? {}) };
  if (operation === "create") {
    scoped.data = scopeData(scoped.data as Data, tenantId);
    return scoped;
  }
  if (operation === "createMany" || operation === "createManyAndReturn") {
    const rows = Array.isArray(scoped.data) ? scoped.data : [scoped.data];
    scoped.data = (rows as Data[]).map((row) => scopeData(row, tenantId));
    return scoped;
  }
  scoped.where = { ...((scoped.where as Data | undefined) ?? {}), tenantId };
  if (operation === "upsert") {
    scoped.create = scopeData(scoped.create as Data, tenantId);
  }
  if (
    (operation === "update" || operation === "updateMany" || operation === "upsert") &&
    scoped.data &&
    "tenantId" in (scoped.data as Data) &&
    (scoped.data as Data).tenantId !== tenantId
  ) {
    throw new TenantMismatchError("tenantId distinto al de la barbería activa");
  }
  return scoped;
}

export function tenantScope(tenantId: string) {
  return Prisma.defineExtension({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(model)) return query(args);
          return query(scopeArgs(operation, args as Data, tenantId));
        },
      },
    },
  });
}

export async function withTenantOn<T>(
  client: PrismaClient,
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!UUID_RE.test(tenantId)) {
    throw new Error(`tenantId inválido: ${tenantId}`);
  }
  const scoped = client.$extends(tenantScope(tenantId));
  return scoped.$transaction(async (tx) => {
    // set_config(..., true) = local a la transacción: no se filtra a otras
    // conexiones del pool.
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx as unknown as Prisma.TransactionClient);
  });
}

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
  return withTenantOn(prisma, tenantId, fn);
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
