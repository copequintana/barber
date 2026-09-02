import type { FullConfig } from "@playwright/test";

/**
 * Warm-up: el primer request tras un arranque frío inicializa Prisma y el
 * pool de pg; dos requests simultáneos en ese instante provocaban un 500
 * intermitente. Se calienta la ruta que toca la BD antes de correr nada.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3100";
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${baseURL}/b/la-cueva`);
      if (res.ok) return;
    } catch {
      // servidor aún levantando
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("El servidor no respondió al warm-up");
}
