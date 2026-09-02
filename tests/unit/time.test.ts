import { describe, expect, it } from "vitest";
import {
  hhmmToMinutes,
  localInputToUtc,
  minutesToHhmm,
  rangesOverlap,
  utcToZoned,
} from "@/lib/time";

describe("hhmm ↔ minutos", () => {
  it("convierte ida y vuelta", () => {
    expect(hhmmToMinutes("09:30")).toBe(570);
    expect(hhmmToMinutes("0:00")).toBe(0);
    expect(hhmmToMinutes("23:59")).toBe(1439);
    expect(minutesToHhmm(570)).toBe("09:30");
    expect(minutesToHhmm(0)).toBe("00:00");
  });

  it("rechaza formatos inválidos", () => {
    for (const bad of ["24:00", "9:5", "abc", "12:60", ""]) {
      expect(() => hhmmToMinutes(bad)).toThrow();
    }
  });
});

describe("localInputToUtc", () => {
  it("convierte hora de pared del tenant a UTC (zona sin DST)", () => {
    // CDMX es UTC-6 fijo desde 2022
    const d = localInputToUtc("America/Mexico_City", "2026-09-01T10:00");
    expect(d?.toISOString()).toBe("2026-09-01T16:00:00.000Z");
  });

  it("respeta el DST en zonas que lo tienen", () => {
    // Nueva York: verano EDT (UTC-4), invierno EST (UTC-5)
    expect(
      localInputToUtc("America/New_York", "2026-07-01T10:00")?.toISOString(),
    ).toBe("2026-07-01T14:00:00.000Z");
    expect(
      localInputToUtc("America/New_York", "2026-01-15T10:00")?.toISOString(),
    ).toBe("2026-01-15T15:00:00.000Z");
  });

  it("devuelve null ante entradas inválidas", () => {
    expect(localInputToUtc("America/Mexico_City", "no-es-fecha")).toBeNull();
    expect(localInputToUtc("America/Mexico_City", "")).toBeNull();
  });

  it("es inversa de utcToZoned", () => {
    const utc = localInputToUtc("America/Santiago", "2026-12-24T20:30")!;
    const back = utcToZoned("America/Santiago", utc);
    expect(back.toFormat("yyyy-MM-dd'T'HH:mm")).toBe("2026-12-24T20:30");
  });
});

describe("rangesOverlap", () => {
  it("detecta solapes y respeta rangos semiabiertos", () => {
    expect(rangesOverlap(0, 60, 30, 90)).toBe(true);
    expect(rangesOverlap(0, 60, 60, 120)).toBe(false); // contiguos: no chocan
    expect(rangesOverlap(30, 40, 0, 120)).toBe(true); // contenido
    expect(rangesOverlap(0, 30, 40, 60)).toBe(false);
  });
});
