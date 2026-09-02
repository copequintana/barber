-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "auto_complete_hours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "reminder_24h_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reminder_2h_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false;
