/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `amenities` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `propertyAmenities` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "propertyAmenities" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "amenities_name_key" ON "amenities"("name");
