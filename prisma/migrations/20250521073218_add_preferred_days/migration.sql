/*
  Warnings:

  - The `preferredDays` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "preferredDays",
ADD COLUMN     "preferredDays" TEXT[];

-- DropEnum
DROP TYPE "WeekDay";
