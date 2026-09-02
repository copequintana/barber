import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import {
  computeDaySlots,
  type ComputeDaySlotsInput,
} from "@/lib/availability";

/**
 * Suite del motor de slots. Los casos de DST usan America/New_York
 * (salto 2026-03-08 02:00→03:00, repetición 2026-11-01 02:00→01:00);
 * los demás, America/Mexico_City (UTC-6 fijo).
 */

const CDMX = "America/Mexico_City";
const NY = "America/New_York";

function base(overrides: Partial<ComputeDaySlotsInput>): ComputeDaySlotsInput {
  return {
    timezone: CDMX,
    dateISO: "2026-10-06", // martes
    workingHours: [{ weekday: 2, startMin: 10 * 60, endMin: 14 * 60 }],
    busy: [],
    durationMin: 30,
    bufferMin: 0,
    gridMinutes: 30,
    minLeadMinutes: 60,
    maxAdvanceDays: 30,
    now: new Date("2026-10-01T12:00:00Z"),
    ...overrides,
  };
}

function localTimes(slots: { start: Date }[], zone: string): string[] {
  return slots.map((s) =>
    DateTime.fromJSDate(s.start, { zone: "utc" }).setZone(zone).toFormat("HH:mm"),
  );
}

describe("generación básica", () => {
  it("corta la franja en slots de la grilla mientras quepa el servicio", () => {
    const slots = computeDaySlots(base({}));
    // 10:00–14:00, servicio 30, grilla 30 → 10:00 … 13:30
    expect(localTimes(slots, CDMX)).toEqual([
      "10:00", "10:30", "11:00", "11:30", "12:00",
      "12:30", "13:00", "13:30",
    ]);
  });

  it("el buffer descuenta espacio: el último slot debe caber completo", () => {
    const slots = computeDaySlots(base({ durationMin: 30, bufferMin: 15 }));
    // total 45: 13:30+45 > 14:00 → último 13:00
    expect(localTimes(slots, CDMX).at(-1)).toBe("13:00");
    // y el end del slot incluye el buffer
    expect(
      (slots[0].end.getTime() - slots[0].start.getTime()) / 60000,
    ).toBe(45);
  });

  it("día sin franjas (descanso) → sin slots", () => {
    expect(computeDaySlots(base({ dateISO: "2026-10-05" }))).toEqual([]); // lunes
  });

  it("franjas partidas generan slots en ambas", () => {
    const slots = computeDaySlots(
      base({
        workingHours: [
          { weekday: 2, startMin: 10 * 60, endMin: 12 * 60 },
          { weekday: 2, startMin: 16 * 60, endMin: 18 * 60 },
        ],
      }),
    );
    const times = localTimes(slots, CDMX);
    expect(times).toContain("11:30");
    expect(times).toContain("16:00");
    expect(times).not.toContain("12:00");
    expect(times).not.toContain("14:00");
  });
});

describe("ocupación", () => {
  const at = (hhmm: string) =>
    DateTime.fromISO(`2026-10-06T${hhmm}`, { zone: CDMX }).toMillis();

  it("una cita bloquea los slots que pisa", () => {
    const slots = computeDaySlots(
      base({ busy: [{ start: at("10:30"), end: at("11:00") }] }),
    );
    const times = localTimes(slots, CDMX);
    expect(times).not.toContain("10:30");
    expect(times).toContain("10:00"); // contiguo antes: libre
    expect(times).toContain("11:00"); // contiguo después: libre
  });

  it("una cita a mitad de grilla bloquea los dos slots que toca", () => {
    const slots = computeDaySlots(
      base({ busy: [{ start: at("10:45"), end: at("11:15") }] }),
    );
    const times = localTimes(slots, CDMX);
    expect(times).not.toContain("10:30");
    expect(times).not.toContain("11:00");
    expect(times).toContain("11:30");
  });

  it("un bloqueo parcial elimina solo su rango", () => {
    const slots = computeDaySlots(
      base({ busy: [{ start: at("12:00"), end: at("13:00") }] }),
    );
    const times = localTimes(slots, CDMX);
    expect(times).toEqual(["10:00", "10:30", "11:00", "11:30", "13:00", "13:30"]);
  });
});

describe("antelación mínima y máxima", () => {
  it("filtra slots dentro de la antelación mínima", () => {
    // now = 10:30 local del mismo día; lead 60 → primer slot 11:30
    const slots = computeDaySlots(
      base({
        now: DateTime.fromISO("2026-10-06T10:30", { zone: CDMX }).toJSDate(),
      }),
    );
    expect(localTimes(slots, CDMX)[0]).toBe("11:30");
  });

  it("día más allá de la antelación máxima → vacío", () => {
    expect(
      computeDaySlots(base({ dateISO: "2026-11-10", maxAdvanceDays: 30 })),
    ).toEqual([]);
  });

  it("el día límite exacto sí ofrece slots; un día más allá, no", () => {
    // now local = 2026-10-01; límite con 12 días = martes 2026-10-13
    const boundary = base({ dateISO: "2026-10-13", maxAdvanceDays: 12 });
    expect(computeDaySlots(boundary).length).toBeGreaterThan(0);
    expect(
      computeDaySlots({ ...boundary, maxAdvanceDays: 11 }),
    ).toEqual([]);
  });

  it("días pasados → vacío", () => {
    expect(computeDaySlots(base({ dateISO: "2026-09-29" }))).toEqual([]);
  });
});

describe("DST", () => {
  it("salto de primavera: las horas de pared inexistentes no generan slots", () => {
    // NY 2026-03-08: 02:00–03:00 no existe. Domingo, franja 01:00–05:00.
    const slots = computeDaySlots(
      base({
        timezone: NY,
        dateISO: "2026-03-08",
        workingHours: [{ weekday: 0, startMin: 60, endMin: 300 }],
        gridMinutes: 30,
        now: new Date("2026-03-01T12:00:00Z"),
      }),
    );
    const times = localTimes(slots, NY);
    expect(times).toContain("01:00");
    expect(times).toContain("03:00");
    // 02:00 y 02:30 no existen ese día
    expect(times).not.toContain("02:00");
    expect(times).not.toContain("02:30");
  });

  it("un día normal en zona con DST genera la cuenta esperada", () => {
    // NY martes 10:00–14:00, 30 min, grilla 30 → 8 slots
    const slots = computeDaySlots(
      base({
        timezone: NY,
        dateISO: "2026-07-07",
        now: new Date("2026-07-01T12:00:00Z"),
      }),
    );
    expect(slots).toHaveLength(8);
    // y el instante UTC es el correcto para EDT (UTC-4)
    expect(slots[0].start.toISOString()).toBe("2026-07-07T14:00:00.000Z");
  });

  it("otoño: el día con hora repetida sigue generando slots coherentes", () => {
    // NY 2026-11-01 (domingo): 01:00–02:00 ocurre dos veces; franja 09:00–12:00
    const slots = computeDaySlots(
      base({
        timezone: NY,
        dateISO: "2026-11-01",
        workingHours: [{ weekday: 0, startMin: 540, endMin: 720 }],
        now: new Date("2026-10-25T12:00:00Z"),
      }),
    );
    expect(localTimes(slots, NY)).toEqual([
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    ]);
    // 09:00 EST = 14:00Z (ya salió del DST)
    expect(slots[0].start.toISOString()).toBe("2026-11-01T14:00:00.000Z");
  });
});

describe("entradas inválidas", () => {
  it("fecha malformada → vacío", () => {
    expect(computeDaySlots(base({ dateISO: "2026-13-45" }))).toEqual([]);
    expect(computeDaySlots(base({ dateISO: "hola" }))).toEqual([]);
  });
});
