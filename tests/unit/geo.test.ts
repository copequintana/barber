import { describe, expect, it } from "vitest";
import { haversineKm } from "@/lib/geo";

describe("haversineKm", () => {
  it("da 0 para el mismo punto", () => {
    const p = { lat: 19.4326, lng: -99.1332 };
    expect(haversineKm(p, p)).toBe(0);
  });

  it("distancia CDMX–Guadalajara ≈ 460 km", () => {
    const cdmx = { lat: 19.4326, lng: -99.1332 };
    const gdl = { lat: 20.6597, lng: -103.3496 };
    const km = haversineKm(cdmx, gdl);
    expect(km).toBeGreaterThan(450);
    expect(km).toBeLessThan(470);
  });

  it("es simétrica", () => {
    const a = { lat: 29.0729, lng: -110.9559 }; // Hermosillo
    const b = { lat: 33.4484, lng: -112.074 }; // Phoenix
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });
});
