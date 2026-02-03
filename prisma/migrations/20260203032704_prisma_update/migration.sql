/*
  Warnings:

  - A unique constraint covering the columns `[code,name]` on the table `amenities` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "amenities_propertyId_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "amenities_code_name_key" ON "amenities"("code", "name");
