/*
  Warnings:

  - You are about to drop the column `propertyId` on the `amenities` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "amenities" DROP CONSTRAINT "amenities_propertyId_fkey";

-- DropIndex
DROP INDEX "amenities_propertyId_name_key";

-- AlterTable
ALTER TABLE "amenities" DROP COLUMN "propertyId";

-- CreateTable
CREATE TABLE "propertyAmenities" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "amenityId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propertyAmenities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "propertyAmenities_propertyId_idx" ON "propertyAmenities"("propertyId");

-- CreateIndex
CREATE INDEX "propertyAmenities_amenityId_idx" ON "propertyAmenities"("amenityId");

-- CreateIndex
CREATE UNIQUE INDEX "propertyAmenities_propertyId_amenityId_key" ON "propertyAmenities"("propertyId", "amenityId");

-- AddForeignKey
ALTER TABLE "propertyAmenities" ADD CONSTRAINT "propertyAmenities_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propertyAmenities" ADD CONSTRAINT "propertyAmenities_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "amenities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
