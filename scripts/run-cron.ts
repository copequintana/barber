import "dotenv/config";
import { prisma } from "../src/lib/db";
import { runCron } from "../src/lib/reminders";

/** Corre el cron de recordatorios/cierre a mano: npm run cron */
runCron()
  .then((stats) => console.log("Cron OK:", JSON.stringify(stats)))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
