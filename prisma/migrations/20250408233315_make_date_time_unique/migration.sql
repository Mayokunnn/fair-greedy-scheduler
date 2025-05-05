/*
  Warnings:

  - A unique constraint covering the columns `[date]` on the table `Workday` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Workday_date_key" ON "Workday"("date");
