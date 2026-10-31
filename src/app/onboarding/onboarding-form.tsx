"use client";

import { useActionState, useState } from "react";
import { AuthError } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { CURRENCIES, TIMEZONES } from "@/lib/timezones";
import { createTenantAction, type OnboardingState } from "./actions";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    createTenantAction,
    { error: null },
  );
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form action={formAction}>
      <FieldGroup className="gap-4">
        {state.error ? <AuthError>{state.error}</AuthError> : null}

        <Field>
          <FieldLabel htmlFor="name">Nombre de la barbería</FieldLabel>
          <Input
            id="name"
            name="name"
            required
            maxLength={60}
            placeholder="La Cueva Barber Shop"
            onChange={(e) => {
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="slug">Dirección de tu página</FieldLabel>
          <div className="flex h-9 items-center overflow-hidden rounded-lg border border-input bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <span className="shrink-0 border-r bg-muted px-2.5 py-2 text-sm text-muted-foreground">/b/</span>
            <input
              id="slug"
              name="slug"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-base outline-none md:text-sm"
            />
          </div>
          <FieldDescription>Es el link que compartes con tus clientes.</FieldDescription>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="timezone">Zona horaria</FieldLabel>
            <NativeSelect id="timezone" name="timezone" required defaultValue="America/Hermosillo" className="w-full">
              {TIMEZONES.map((tz) => (
                <NativeSelectOption key={tz} value={tz}>
                  {tz.replace("America/", "").replaceAll("_", " ")}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="currency">Moneda</FieldLabel>
            <NativeSelect id="currency" name="currency" required defaultValue="MXN" className="w-full">
              {CURRENCIES.map((c) => (
                <NativeSelectOption key={c} value={c}>
                  {c}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? (
            <>
              <Spinner /> Creando…
            </>
          ) : (
            "Crear barbería"
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
