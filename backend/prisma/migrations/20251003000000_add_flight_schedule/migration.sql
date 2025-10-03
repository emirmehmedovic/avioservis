-- CreateTable
CREATE TABLE "FlightSchedule" (
    "id" SERIAL NOT NULL,
    "airlineId" INTEGER NOT NULL,
    "destination" TEXT NOT NULL,
    "flight_number" TEXT,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "expected_operations" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FlightSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlightSchedule_airlineId_idx" ON "FlightSchedule"("airlineId");

-- CreateIndex
CREATE INDEX "FlightSchedule_scheduled_date_idx" ON "FlightSchedule"("scheduled_date");

-- CreateIndex
CREATE INDEX "FlightSchedule_destination_idx" ON "FlightSchedule"("destination");

-- CreateIndex
CREATE INDEX "FlightSchedule_is_deleted_idx" ON "FlightSchedule"("is_deleted");

-- AddForeignKey
ALTER TABLE "FlightSchedule" ADD CONSTRAINT "FlightSchedule_airlineId_fkey" FOREIGN KEY ("airlineId") REFERENCES "Airline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightSchedule" ADD CONSTRAINT "FlightSchedule_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;



