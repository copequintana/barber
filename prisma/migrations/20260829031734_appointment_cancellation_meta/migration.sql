-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('customer', 'shop');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "cancelled_by" "CancelledBy";
