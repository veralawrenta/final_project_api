-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('PUBLISHED', 'DRAFT');

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "propertyStatus" "PropertyStatus" NOT NULL DEFAULT 'DRAFT';
