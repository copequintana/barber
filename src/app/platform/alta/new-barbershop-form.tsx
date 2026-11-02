"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/admin/submit-button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { slugify } from "@/lib/slugs";
import { CURRENCIES, TIMEZONES } from "@/lib/timezones";
import { createBarbershopAction } from "./actions";

export function NewBarbershopForm({ host }: { host: string }) {
  const [slug, setSlug] = useState("");
  const [edited, setEdited] = useState(false);

  return (
    <form action={createBarbershopAction}>
      <FieldGroup className="gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="name">Nombre de la barbería</FieldLabel>
            <Input
              id="name"
              name="name"
              required
              maxLength={60}
              placeholder="La Cueva Barber Shop"
              onChange={(e) => {
                if (!edited) setSlug(slugify(e.target.value));
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="slug">Link de reservas</FieldLabel>
            <div className="flex h-9 items-center overflow-hidden rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
              <span className="font-num flex h-full shrink-0 items-center border-r border-input bg-muted px-2.5 text-sm text-muted-foreground">{host}/b/</span>
              <input
                id="slug"
                name="slug"
                required
                minLength={3}
                maxLength={40}
                value={slug}
                onChange={(e) => {
                  setEdited(true);
                  setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                }}
                className="font-num h-full min-w-0 flex-1 bg-transparent px-2.5 text-base outline-none md:text-sm"
                placeholder="la-cueva"
              />
            </div>
            <FieldDescription>Letras sin acentos, números y guiones.</FieldDescription>
          </Field>
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
          <Field>
            <FieldLabel htmlFor="ownerName">Nombre del dueño</FieldLabel>
            <Input id="ownerName" name="ownerName" required maxLength={80} autoComplete="off" />
          </Field>
          <Field>
            <FieldLabel htmlFor="ownerEmail">Correo del dueño</FieldLabel>
            <Input id="ownerEmail" name="ownerEmail" type="email" required maxLength={120} autoComplete="off" />
            <FieldDescription>Le llega un correo para crear su contraseña.</FieldDescription>
          </Field>
        </div>
        <SubmitButton pendingLabel="Dando de alta…" className="self-start">
          Dar de alta y enviar invitación
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
