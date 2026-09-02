import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth, devLoginEnabled, signIn } from "@/lib/auth";

export const metadata = { title: "Entrar · BarberDesk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/select-tenant");

  const { error } = await searchParams;
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  async function devLogin(formData: FormData) {
    "use server";
    try {
      await signIn("dev-login", {
        email: String(formData.get("email") ?? ""),
        redirectTo: "/select-tenant",
      });
    } catch (e) {
      if (e instanceof AuthError) redirect("/login?error=credenciales");
      throw e; // NEXT_REDIRECT del login exitoso
    }
  }

  async function googleLogin() {
    "use server";
    await signIn("google", { redirectTo: "/select-tenant" });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-bold">BarberDesk</h1>
        <p className="text-sm opacity-70">Entra para administrar tu barbería.</p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          No se pudo iniciar sesión. Revisa el email e intenta de nuevo.
        </p>
      ) : null}

      {devLoginEnabled ? (
        <form action={devLogin} className="flex flex-col gap-3">
          <label className="text-sm font-medium" htmlFor="email">
            Email (login de desarrollo)
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="dueno@lacueva.test"
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
          <button
            type="submit"
            className="rounded-md bg-foreground px-3 py-2 font-medium text-background"
          >
            Entrar
          </button>
          <p className="text-xs opacity-60">
            Solo en desarrollo: crea el usuario si no existe. Prueba con{" "}
            <code>dueno@lacueva.test</code> (seed).
          </p>
        </form>
      ) : null}

      {googleEnabled ? (
        <form action={googleLogin}>
          <button
            type="submit"
            className="w-full rounded-md border border-black/15 px-3 py-2 font-medium dark:border-white/20"
          >
            Continuar con Google
          </button>
        </form>
      ) : null}

      {!devLoginEnabled && !googleEnabled ? (
        <p className="text-sm opacity-70">
          No hay proveedores de login configurados. Define GOOGLE_CLIENT_ID y
          GOOGLE_CLIENT_SECRET (o AUTH_RESEND_KEY cuando esté disponible el
          magic link).
        </p>
      ) : null}
    </main>
  );
}
