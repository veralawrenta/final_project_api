-- DropForeignKey
ALTER TABLE "seasonalRates" DROP CONSTRAINT "seasonalRates_roomId_fkey";

-- AlterTable
ALTER TABLE "seasonalRates" ALTER COLUMN "roomId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "seasonalRates" ADD CONSTRAINT "seasonalRates_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
