import { expect, test } from "@playwright/test";

/**
 * Flujo de reserva de punta a punta contra datos del seed (la-cueva):
 * servicio → barbero → fecha/hora → datos → confirmación con link de cita.
 */

test("un cliente reserva sin cuenta en el flujo de 4 pasos", async ({
  page,
}) => {
  const phone = `555${Date.now().toString().slice(-7)}`;

  await page.goto("/b/la-cueva");
  await expect(
    page.getByRole("heading", { name: "La Cueva Barber Shop" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Reservar cita" }).click();

  // Paso 1: servicio
  await page.getByRole("button", { name: /Corte clásico/ }).click();

  // Paso 2: barbero
  await page.getByRole("button", { name: /Cualquier barbero/ }).click();

  // Paso 3: buscar un día con horarios (el seed abre martes a sábado).
  // Espera a que la carga del día RESUELVA (slots o "no hay horarios") antes
  // de decidir: en un servidor frío el fetch puede tardar varios segundos.
  const slot = page
    .locator("div.grid button", { hasText: /^\d{2}:\d{2}$/ })
    .first();
  const emptyDay = page.getByText("No hay horarios ese día");
  const dayResolved = async () => {
    await Promise.race([
      slot.waitFor({ timeout: 15_000 }).catch(() => {}),
      emptyDay.waitFor({ timeout: 15_000 }).catch(() => {}),
    ]);
    return slot.isVisible().catch(() => false);
  };
  for (let i = 0; i < 8; i++) {
    if (await dayResolved()) break;
    await page
      .locator("div.overflow-x-auto button")
      .nth(i + 1)
      .click();
  }
  await expect(slot).toBeVisible();
  await slot.click();

  // Paso 4: datos. Si otro cliente (el otro worker del test) gana el slot,
  // se ejercita la recuperación: refrescar horarios, elegir otro, reintentar.
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByLabel("Tu nombre").fill("E2E Cliente");
    await page.getByLabel(/Teléfono/).fill(phone);
    await page.getByRole("button", { name: "Confirmar reserva" }).click();

    const outcome = await Promise.race([
      page
        .waitForURL(/\/b\/la-cueva\/cita\//, { timeout: 15_000 })
        .then(() => "ok" as const)
        .catch(() => "timeout" as const),
      page
        .getByRole("button", { name: "Ver horarios disponibles" })
        .waitFor({ timeout: 15_000 })
        .then(() => "conflict" as const)
        .catch(() => "timeout" as const),
    ]);
    if (outcome === "ok") break;
    // Respuesta lenta: puede haber navegado justo después del race
    if (outcome === "timeout" && page.url().includes("/cita/")) break;
    expect(outcome).toBe("conflict");
    await page
      .getByRole("button", { name: "Ver horarios disponibles" })
      .click();
    expect(await dayResolved()).toBe(true);
    await slot.click();
  }

  // Confirmación: página de la cita con link permanente
  await expect(page).toHaveURL(/\/b\/la-cueva\/cita\/[0-9a-f-]{36}/);
  await expect(page.getByText("¡Cita reservada!")).toBeVisible();
  await expect(page.getByText("Corte clásico")).toBeVisible();
  await expect(page.getByText("E2E Cliente")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cancelar mi cita" }),
  ).toBeVisible();

  // Reprogramación self-service desde el mismo link (T14)
  await page.getByRole("link", { name: "Cambiar horario" }).click();
  await expect(
    page.getByRole("heading", { name: "Cambiar horario" }),
  ).toBeVisible();

  const newSlot = page
    .locator("div.grid button", { hasText: /^\d{2}:\d{2}$/ })
    .last();
  const rescheduleDayResolved = async () => {
    await Promise.race([
      newSlot.waitFor({ timeout: 15_000 }).catch(() => {}),
      page
        .getByText("No hay horarios ese día")
        .waitFor({ timeout: 15_000 })
        .catch(() => {}),
    ]);
    return newSlot.isVisible().catch(() => false);
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    // buscar un día con horarios, desde MAÑANA: un slot de hoy podría quedar
    // a <2h y entonces la política ya no permitiría cancelarla al final
    for (let i = 0; i < 8; i++) {
      await page.locator("div.overflow-x-auto button").nth(i + 1).click();
      if (await rescheduleDayResolved()) break;
    }
    await expect(newSlot).toBeVisible();
    await newSlot.click();
    await page
      .getByRole("button", { name: /Confirmar nuevo horario/ })
      .click();

    const outcome = await Promise.race([
      page
        .waitForURL(/\?movida=1/, { timeout: 15_000 })
        .then(() => "ok" as const)
        .catch(() => "timeout" as const),
      page
        .getByRole("button", { name: "Actualizar horarios" })
        .waitFor({ timeout: 15_000 })
        .then(() => "conflict" as const)
        .catch(() => "timeout" as const),
    ]);
    if (outcome === "ok") break;
    if (outcome === "timeout" && page.url().includes("movida=1")) break;
    expect(outcome).toBe("conflict");
    await page.getByRole("button", { name: "Actualizar horarios" }).click();
  }
  await expect(page.getByText("quedó en el nuevo horario")).toBeVisible();

  // Y puede cancelarla desde el mismo link
  await page.getByRole("button", { name: "Cancelar mi cita" }).click();
  await expect(page.getByText("Tu cita fue cancelada")).toBeVisible();
});
