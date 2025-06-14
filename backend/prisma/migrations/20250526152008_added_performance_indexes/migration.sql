-- CreateIndex
CREATE INDEX "FixedStorageTanks_status_idx" ON "FixedStorageTanks"("status");

-- CreateIndex
CREATE INDEX "FixedStorageTanks_createdAt_idx" ON "FixedStorageTanks"("createdAt");

-- CreateIndex
CREATE INDEX "FixedTankTransfers_transfer_datetime_idx" ON "FixedTankTransfers"("transfer_datetime");

-- CreateIndex
CREATE INDEX "FixedTankTransfers_activity_type_idx" ON "FixedTankTransfers"("activity_type");

-- CreateIndex
CREATE INDEX "FuelingOperation_dateTime_idx" ON "FuelingOperation"("dateTime");

-- CreateIndex
CREATE INDEX "FuelingOperation_airlineId_idx" ON "FuelingOperation"("airlineId");

-- CreateIndex
CREATE INDEX "FuelingOperation_aircraft_registration_idx" ON "FuelingOperation"("aircraft_registration");

-- CreateIndex
CREATE INDEX "FuelingOperation_tankId_idx" ON "FuelingOperation"("tankId");

-- CreateIndex
CREATE INDEX "FuelingOperation_operator_name_idx" ON "FuelingOperation"("operator_name");

-- CreateIndex
CREATE INDEX "FuelingOperation_tip_saobracaja_idx" ON "FuelingOperation"("tip_saobracaja");

-- CreateIndex
CREATE INDEX "FuelingOperation_flight_number_idx" ON "FuelingOperation"("flight_number");

-- CreateIndex
CREATE INDEX "FuelingOperation_delivery_note_number_idx" ON "FuelingOperation"("delivery_note_number");

-- CreateIndex
CREATE INDEX "FuelingOperation_createdAt_idx" ON "FuelingOperation"("createdAt");
