/*
  Warnings:

  - The values [GOPAY] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `maxGuests` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `radius` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `isCover` on the `roomImages` table. All the data in the column will be lost.
  - You are about to drop the column `urlImages` on the `roomImages` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `roomNonAvailability` table. All the data in the column will be lost.
  - You are about to drop the column `bath` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `beds` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `roomClass` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `priceAdjustmentValue` on the `seasonalRates` table. All the data in the column will be lost.
  - You are about to drop the `City` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[roomId,startDate,endDate]` on the table `roomNonAvailability` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `propertyType` to the `properties` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endDate` to the `roomNonAvailability` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `roomNonAvailability` table without a default value. This is not possible if the table is not empty.
  - Made the column `totalGuests` on table `rooms` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `fixedPrice` to the `seasonalRates` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('VILLA', 'HOUSE', 'APARTMENT', 'HOTEL');

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('BANK_TRANSFER', 'CREDIT_CARD', 'SHOPEEPAY');
ALTER TABLE "transactions" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new" USING ("paymentMethod"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "public"."PaymentMethod_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "properties" DROP CONSTRAINT "properties_cityId_fkey";

-- DropIndex
DROP INDEX "roomNonAvailability_roomId_date_key";

-- AlterTable
ALTER TABLE "properties" DROP COLUMN "maxGuests",
DROP COLUMN "radius",
ADD COLUMN     "propertyType" "PropertyType" NOT NULL;

-- AlterTable
ALTER TABLE "roomImages" DROP COLUMN "isCover",
DROP COLUMN "urlImages",
ADD COLUMN     "urlImage" TEXT;

-- AlterTable
ALTER TABLE "roomNonAvailability" DROP COLUMN "date",
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "rooms" DROP COLUMN "bath",
DROP COLUMN "beds",
DROP COLUMN "images",
DROP COLUMN "roomClass",
ALTER COLUMN "totalGuests" SET NOT NULL;

-- AlterTable
ALTER TABLE "seasonalRates" DROP COLUMN "priceAdjustmentValue",
ADD COLUMN     "fixedPrice" INTEGER NOT NULL;

-- DropTable
DROP TABLE "City";

-- DropEnum
DROP TYPE "RoomClass";

-- CreateTable
CREATE TABLE "cities" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_key" ON "cities"("name");

-- CreateIndex
CREATE INDEX "properties_cityId_idx" ON "properties"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "roomNonAvailability_roomId_startDate_endDate_key" ON "roomNonAvailability"("roomId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
