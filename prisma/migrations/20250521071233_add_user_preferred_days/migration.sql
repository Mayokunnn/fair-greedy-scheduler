-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredDays" "WeekDay"[];
