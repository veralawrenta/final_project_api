-- DropForeignKey
ALTER TABLE "amenities" DROP CONSTRAINT "amenities_propertyId_fkey";

-- AlterTable
ALTER TABLE "amenities" ADD COLUMN     "code" TEXT,
ALTER COLUMN "propertyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "roomNonAvailability" ALTER COLUMN "roomInventory" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "amenities" ADD CONSTRAINT "amenities_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
