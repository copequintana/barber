-- Perfil público del tenant (portada + contacto) para /b/[slug].

-- AlterTable
ALTER TABLE "tenants"
  ADD COLUMN "cover_image_url" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "address" TEXT;
