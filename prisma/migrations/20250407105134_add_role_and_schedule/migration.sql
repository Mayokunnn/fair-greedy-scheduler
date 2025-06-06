/*
  Warnings:

  - You are about to drop the `_ScheduleToUser` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `Schedule` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_ScheduleToUser" DROP CONSTRAINT "_ScheduleToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_ScheduleToUser" DROP CONSTRAINT "_ScheduleToUser_B_fkey";

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "_ScheduleToUser";

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
