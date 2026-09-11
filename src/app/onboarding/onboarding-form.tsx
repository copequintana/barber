"use client";

import { useActionState, useState } from "react";
import { createTenantAction, type OnboardingState } from "./actions";
import { CURRENCIES, TIMEZONES } from "@/lib/timezones";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const inputClass =
  "rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    createTenantAction,
    { error: null },
  );
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="name">
          Nombre de la barbería
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={60}
          placeholder="La Cueva Barber Shop"
          className={inputClass}
          onChange={(e) => {
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="slug">
          Dirección de tu página
        </label>
        <div className="flex items-center gap-1">
          <span className="text-sm opacity-60">barberdesk.app/b/</span>
          <input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            className={`${inputClass} flex-1`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="timezone">
            Zona horaria
          </label>
          <select
            id="timezone"
            name="timezone"
            required
            defaultValue="America/Mexico_City"
            className={inputClass}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace("America/", "").replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="currency">
            Moneda
          </label>
          <select
            id="currency"
            name="currency"
            required
            defaultValue="MXN"
            className={inputClass}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-3 py-2 font-medium text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Creando…" : "Crear barbería"}
      </button>
    </form>
  );
}
