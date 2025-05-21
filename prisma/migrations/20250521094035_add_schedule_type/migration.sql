-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('FAIR', 'BASIC', 'RANDOM', 'ROUND_ROBIN', 'MANUAL');

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "type" "ScheduleType" NOT NULL DEFAULT 'FAIR';
