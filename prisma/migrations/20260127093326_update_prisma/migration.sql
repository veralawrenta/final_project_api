/*
  Warnings:

  - You are about to drop the column `urlImage` on the `roomImages` table. All the data in the column will be lost.
  - You are about to drop the column `totalUnit` on the `rooms` table. All the data in the column will be lost.
  - Added the required column `urlImages` to the `roomImages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalUnits` to the `rooms` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "roomImages" DROP COLUMN "urlImage",
ADD COLUMN     "urlImages" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "rooms" DROP COLUMN "totalUnit",
ADD COLUMN     "totalUnits" INTEGER NOT NULL;
