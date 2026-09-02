import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { prisma } from "./db";

/**
 * Autenticación (T03).
 *
 * Estrategia JWT: el token lleva solo la identidad (userId). El tenant activo
 * vive en una cookie propia y el rol se verifica contra `memberships` en cada
 * request (ver guards.ts) — nunca hay roles obsoletos cacheados en el token.
 *
 * Proveedores:
 *  - "dev-login": entra con cualquier email, solo fuera de producción.
 *  - Google: se activa solo si hay GOOGLE_CLIENT_ID/SECRET en el entorno.
 *  - (Fase 1) Magic link por email con Resend.
 */

/**
 * dev-login se habilita con NODE_ENV != production o con ALLOW_DEV_LOGIN=1
 * (este último permite probar un build de producción en local). En un
 * despliegue real la variable no debe existir.
 */
export const devLoginEnabled =
  process.env.NODE_ENV !== "production" ||
  process.env.ALLOW_DEV_LOGIN === "1";

const providers: Provider[] = [];

if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Login de desarrollo",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(credentials) {
        const parsed = z
          .object({ email: z.string().email() })
          .safeParse(credentials);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        const user = await prisma.user.upsert({
          where: { email },
          update: {},
          create: { email, name: email.split("@")[0] },
        });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  );
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(Google);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Self-hosted: se confía en el Host del reverse proxy / servidor propio.
  // (En Vercel lo setea AUTH_TRUST_HOST automáticamente.)
  trustHost: true,
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, account }) {
      // Primer sign-in: asegurar que el usuario exista en nuestra tabla y
      // guardar SU id (no el del proveedor) en el token.
      if (user?.email) {
        if (account?.provider === "dev-login") {
          token.userId = user.id;
        } else {
          const dbUser = await prisma.user.upsert({
            where: { email: user.email.toLowerCase() },
            update: { name: user.name ?? undefined },
            create: {
              email: user.email.toLowerCase(),
              name: user.name,
            },
          });
          token.userId = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
