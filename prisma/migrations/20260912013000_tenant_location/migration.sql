-- Ubicación de la barbería (para /directorio: "barberías cerca de mí").

-- AlterTable
ALTER TABLE "tenants"
  ADD COLUMN "lat" DOUBLE PRECISION,
  ADD COLUMN "lng" DOUBLE PRECISION;
