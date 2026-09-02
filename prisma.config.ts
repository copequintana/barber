import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Las migraciones corren con el rol dueño del esquema; la app usa
    // DATABASE_URL (rol sin privilegios, sujeto a RLS) vía driver adapter.
    url: process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL!,
  },
});
