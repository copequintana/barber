-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "demo_expires_at" TIMESTAMPTZ,
ADD COLUMN     "demo_owner_id" UUID,
ADD COLUMN     "is_demo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_vendor" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "tenants_is_demo_demo_expires_at_idx" ON "tenants"("is_demo", "demo_expires_at");

-- CreateIndex
CREATE INDEX "tenants_demo_owner_id_idx" ON "tenants"("demo_owner_id");
