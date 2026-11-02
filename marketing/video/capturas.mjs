import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = process.env.CAPTURAS_URL || "http://localhost:3000";
const DB_URL = process.env.CAPTURAS_DB_URL || "postgresql://barberdesk:barberdesk@localhost:5433/barberdesk";
const out = path.resolve(process.argv[2] || path.join(__dirname, "capturas"));

const TEMAS = ["moderno", "clasica", "asfalto", "neon", "loteria", "cancha", "poste", "galeria"];
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "es-MX", colorScheme: "light", timezoneId: "America/Hermosillo" };
const DESKTOP = { viewport: { width: 1366, height: 860 }, deviceScaleFactor: 2, locale: "es-MX", colorScheme: "light", timezoneId: "America/Hermosillo" };

async function db(sql, params = []) {
  const c = new pg.Client({ connectionString: DB_URL });
  await c.connect();
  try { return (await c.query(sql, params)).rows; } finally { await c.end(); }
}

async function ready(page) {
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
}

async function login(browser, options, email, home) {
  const ctx = await browser.newContext(options);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill("#email", email);
  await page.fill("#password", "barberdesk123");
  await Promise.all([page.waitForURL(/select-tenant/), page.click("button[type=submit]")]);
  await Promise.all([page.waitForURL(home), page.click("button:has-text('La Cueva')")]);
  await page.waitForLoadState("networkidle");
  return { ctx, page };
}

async function restore() {
  await db("update tenants set theme='moderno', brand_color='#b45309' where slug='la-cueva'");
}

const LOCAL = /^[a-z]+:\/\/([^@/]*@)?(localhost|127\.0\.0\.1)[:/]/;
if (!LOCAL.test(DB_URL) || !LOCAL.test(BASE)) {
  console.error("Las capturas solo se toman contra la base y el servidor locales");
  process.exit(1);
}

(async () => {
  const [cita] = await db("select a.cancel_token from appointments a join tenants t on t.id=a.tenant_id where t.slug='la-cueva' and a.status='confirmed' and a.starts_at > now() order by a.starts_at desc limit 1");
  if (!cita) throw new Error("La Cueva no tiene citas confirmadas a futuro; crea una con scripts/dev-make-booking.ts");

  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge", headless: true });

  try {
    for (const tema of TEMAS) {
      await db("update tenants set theme=$1, brand_color=$2 where slug='la-cueva'", [tema, tema === "moderno" ? "#b45309" : null]);
      const ctx = await browser.newContext(PHONE);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/b/la-cueva`, { waitUntil: "networkidle" });
      await ready(page);
      await page.screenshot({ path: path.join(out, `tema-${tema}.png`) });

      if (tema === "moderno") {
        await page.locator("div.fixed.bottom-0").first().screenshot({ path: path.join(out, "barra-reservar.png") });
        await page.addStyleTag({ content: "div.fixed.bottom-0{display:none!important}" });
        await page.screenshot({ path: path.join(out, "publica-larga.png"), fullPage: true });

        await page.goto(`${BASE}/b/la-cueva/reservar`, { waitUntil: "networkidle" });
        await page.click("button:has-text('Corte + barba')");
        await page.click("button:has-text('Manuel')");
        await page.locator("div.grid button").first().waitFor({ timeout: 20000 });
        await ready(page);
        await page.screenshot({ path: path.join(out, "horario-vacio.png") });
        await page.locator("div.grid button").nth(2).click();
        await ready(page);
        await page.screenshot({ path: path.join(out, "horario.png") });

        await page.goto(`${BASE}/b/la-cueva/cita/${cita.cancel_token}?nueva=1`, { waitUntil: "networkidle" });
        await ready(page);
        await page.screenshot({ path: path.join(out, "cita.png") });
      }
      await ctx.close();
    }
  } finally {
    await restore();
  }

  const barbero = await login(browser, PHONE, "manuel@lacueva.test", /\/barber/);
  await ready(barbero.page);
  await barbero.page.screenshot({ path: path.join(out, "barbero.png") });
  await barbero.ctx.close();

  const dueno = await login(browser, DESKTOP, "dueno@lacueva.test", /\/admin/);
  for (const [nombre, ruta] of [["agenda", "/admin/agenda"], ["inicio", "/admin"], ["reportes", "/admin/reports"]]) {
    await dueno.page.goto(BASE + ruta, { waitUntil: "networkidle" });
    await ready(dueno.page);
    await dueno.page.screenshot({ path: path.join(out, `${nombre}.png`) });
  }
  await dueno.ctx.close();
  await browser.close();
  console.log(`listo: ${out}`);
})().catch(async (e) => {
  console.error("ERROR:", e.message);
  await restore().catch(() => {});
  process.exit(1);
});
