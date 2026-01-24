/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `users` table. All the data in the column will be lost.
  - Made the column `urlImages` on table `propertyImages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `urlImage` on table `roomImages` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "propertyImages" ALTER COLUMN "urlImages" SET NOT NULL;

-- AlterTable
ALTER TABLE "roomImages" ADD COLUMN     "isCover" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "urlImage" SET NOT NULL;

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "imageUrl",
ADD COLUMN     "avatar" TEXT,
ALTER COLUMN "bankName" DROP NOT NULL,
ALTER COLUMN "bankNumber" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "imageUrl",
ADD COLUMN     "avatar" TEXT;
