-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "suspended" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "platform_audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tenant_id" UUID,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_audit_logs_tenant_id_idx" ON "platform_audit_logs"("tenant_id");
