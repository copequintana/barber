import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";
import { sendEmail } from "./email/send";
import { setPasswordEmail } from "./email/templates";
import { signupEnabled } from "./flags";

/**
 * Autenticación (T03, migrada a Better Auth).
 *
 * Email + contraseña con sesiones en base de datos. El tenant activo vive en
 * una cookie propia y el rol se verifica contra `memberships` en cada request
 * (ver guards.ts) — nunca hay roles obsoletos cacheados.
 *
 * El registro público se controla con ALLOW_SIGNUP (ver flags.ts): se abre
 * para crear las cuentas y luego puede cerrarse sin afectar a las existentes.
 */

// En Vercel el dominio cambia entre despliegues de vista previa, así que se
// usan las variables que inyecta la plataforma como respaldo de
// BETTER_AUTH_URL. VERCEL_PROJECT_PRODUCTION_URL es el dominio estable.
const vercelURLs = [
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
  process.env.VERCEL_URL,
]
  .filter(Boolean)
  .map((host) => `https://${host}`);

const baseURL = process.env.BETTER_AUTH_URL ?? vercelURLs[0];

const trustedOrigins = [
  ...new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    // Puerto del servidor de los tests e2e (playwright.config.ts)
    "http://localhost:3100",
    ...vercelURLs,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? []),
  ]),
];

export const auth = betterAuth({
  baseURL,
  trustedOrigins,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Cerrar el registro no afecta a las cuentas ya creadas.
    disableSignUp: !signupEnabled,
    // 3 días: el mismo link sirve para "olvidé mi contraseña" (urgente) y
    // para la invitación de un barbero (puede tardar en revisar su correo).
    resetPasswordTokenExpiresIn: 3 * 24 * 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      // Sin cuenta credential todavía = invitación (barbero recién
      // vinculado), no olvido de contraseña: el copy del correo cambia
      // según el caso. El nombre del negocio sale de `memberships` (tabla
      // global, sin RLS) y no de `barbers` (con RLS: fuera de una request
      // de admin no hay app.tenant_id seteado, así que esa consulta
      // devolvería vacío siempre).
      const [hasPassword, membership] = await Promise.all([
        prisma.account.findFirst({
          where: { userId: user.id, providerId: "credential" },
          select: { id: true },
        }),
        prisma.membership.findFirst({
          where: { userId: user.id, role: "barber" },
          select: { tenant: { select: { name: true } } },
        }),
      ]);
      const { subject, html } = setPasswordEmail({
        url,
        isNewAccount: !hasPassword,
        tenantName: membership?.tenant.name,
      });
      const result = await sendEmail({ to: user.email, subject, html });
      if (!result.ok) {
        console.error("[auth] error enviando email de contraseña:", result.error);
      }
    },
  },
  advanced: {
    // users.id y las FKs son columnas uuid de Postgres
    database: { generateId: () => crypto.randomUUID() },
  },
});

/** Sesión del request actual (o null). Solo en Server Components/Actions. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Cierra la sesión y redirige. Mismo contrato que el signOut de Auth.js. */
export async function signOut({ redirectTo }: { redirectTo: string }) {
  await auth.api.signOut({ headers: await headers() });
  redirect(redirectTo);
}
