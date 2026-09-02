"use server";

import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ACTIVE_TENANT_COOKIE, requireUser } from "@/lib/guards";
import { RESERVED_SLUGS, SLUG_RE } from "@/lib/tenancy";
import { CURRENCIES, TIMEZONES } from "@/lib/timezones";

const schema = z.object({
  name: z.string().trim().min(2, "El nombre es muy corto").max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      SLUG_RE,
      "Solo minúsculas, números y guiones (3–40 caracteres, sin guión al inicio/fin)",
    ),
  timezone: z.enum(TIMEZONES, { error: "Elige una zona horaria" }),
  currency: z.enum(CURRENCIES, { error: "Elige una moneda" }),
});

export type OnboardingState = { error: string | null };

export async function createTenantAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const user = await requireUser();

  const parsed = schema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    timezone: formData.get("timezone"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los campos" };
  }
  if (RESERVED_SLUGS.has(parsed.data.slug)) {
    return { error: "Ese identificador está reservado, elige otro." };
  }

  let tenantId: string;
  try {
    const tenant = await prisma.tenant.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        timezone: parsed.data.timezone,
        currency: parsed.data.currency,
        memberships: { create: { userId: user.id, role: "owner" } },
      },
    });
    tenantId = tenant.id;
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { error: "Ese identificador ya está en uso, elige otro." };
    }
    throw e;
  }

  const store = await cookies();
  store.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect("/admin");
}
