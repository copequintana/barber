import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import {
  contrastRatio,
  DARK_TEXT,
  LIGHT_TEXT,
  readableTextOn,
  textColorOnWhite,
} from "@/lib/color";
import { formatMoney } from "@/lib/money";
import { longDateEs } from "@/lib/time";

describe("contraste del color de marca", () => {
  it("usa texto blanco sobre colores oscuros", () => {
    expect(readableTextOn("#1e3a5f")).toBe(LIGHT_TEXT);
    expect(readableTextOn("#b45309")).toBe(LIGHT_TEXT);
    expect(readableTextOn("#000000")).toBe(LIGHT_TEXT);
  });

  it("usa texto oscuro sobre colores claros", () => {
    expect(readableTextOn("#facc15")).toBe(DARK_TEXT);
    expect(readableTextOn("#ffffff")).toBe(DARK_TEXT);
    expect(readableTextOn("#a3e635")).toBe(DARK_TEXT);
  });

  it("calcula la razón de contraste WCAG", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("solo usa la marca como texto sobre blanco si se lee", () => {
    expect(textColorOnWhite("#1e3a5f")).toBe("#1e3a5f");
    expect(textColorOnWhite("#facc15")).toBe(DARK_TEXT);
  });
});

describe("formato de dinero", () => {
  it("muestra pesos con signo y sin decimales cuando son enteros", () => {
    expect(formatMoney(180, "MXN")).toBe("$180");
    expect(formatMoney(1280, "MXN")).toBe("$1,280");
  });

  it("conserva los centavos cuando existen", () => {
    expect(formatMoney(150.5, "MXN")).toBe("$150.50");
  });
});

describe("fecha larga en español", () => {
  it("solo capitaliza la primera letra", () => {
    const date = DateTime.fromISO("2026-10-30", { zone: "America/Mexico_City" });
    expect(longDateEs(date)).toBe("Viernes 30 de octubre");
  });
});
