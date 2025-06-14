export enum ValveTestType {
  HECPV = 'HECPV',
  ILPCV = 'ILPCV'
}

export interface ValveTestRecord {
  id: number;
  vehicleId: number;
  testType: ValveTestType;
  testDate: Date | string; // Maps to 'Testing date:' in footer
  vehicleNumber: string;
  fuelHoseType: string;
  fuelHoseProductionDate?: Date | string | null;
  notes?: string | null; // Maps to 'Notes/disadvantages'
  createdAt: Date | string;
  updatedAt: Date | string;

  // Fields from 'PREPERATION TEST'
  preparationTestPressureAtZero?: number | null;
  preparationTestPressureReading?: number | null;

  // Fields from '"HECPV" SURGE CONTROL TEST'
  hecpvTestPressure?: number | null;
  hecpvTestPressureGauge?: string | null;
  hecpvSurgeControlSetPressure?: number | null;
  hecpvSurgeControlGauge?: string | null;
  hecpvSurgeControlMaxFlowRate?: number | null;
  hecpvSurgeControlMaxPressure?: number | null; // Max. Pressure (2-3 second closing time)
  hecpvSurgeControlPressureReading?: number | null;
  hecpvSurgeControlTestResult?: string | null;

  // Fields from 'RECORD OF SLOWLY TEST "HECPV"'
  hecpvSlowlyTestFlowRate?: number | null;
  hecpvSlowlyTestMaxPressure?: number | null; // Max pressure (during slow closing)
  hecpvSlowlyTestPressureAtNoFlow?: number | null;
  hecpvSlowlyTestCreepTestPressure?: number | null; // Pressure after 30seconds (at full closed valve A)

  // Fields from 'RECORD OF "ILPCV"'
  ilpcvRecordFlowRate?: number | null;
  ilpcvRecordMaxPressure?: number | null; // Max pressure (during normal closing)
  ilpcvRecordPressureAtNoFlow?: number | null;
  ilpcvRecordCreepTestPressure?: number | null; // Pressure after 30seconds (at full closed valve A)

  // Footer fields
  nextTestDate?: Date | string | null;
  placeOfPerformedTest?: string | null;
  controlPerformedBy?: string | null;
  approvedControlBy?: string | null;
}

export interface CreateValveTestRecordPayload {
  vehicleId: number;
  testType: ValveTestType;
  testDate: string; // Maps to 'Testing date:' in footer
  vehicleNumber: string;
  fuelHoseType: string;
  fuelHoseProductionDate?: string | null;
  notes?: string | null; // Maps to 'Notes/disadvantages'

  // Fields from 'PREPERATION TEST'
  preparationTestPressureAtZero?: number | null;
  preparationTestPressureReading?: number | null;

  // Fields from '"HECPV" SURGE CONTROL TEST'
  hecpvTestPressure?: number | null;
  hecpvTestPressureGauge?: string | null;
  hecpvSurgeControlSetPressure?: number | null;
  hecpvSurgeControlGauge?: string | null;
  hecpvSurgeControlMaxFlowRate?: number | null;
  hecpvSurgeControlMaxPressure?: number | null;
  hecpvSurgeControlPressureReading?: number | null;
  hecpvSurgeControlTestResult?: string | null;

  // Fields from 'RECORD OF SLOWLY TEST "HECPV"'
  hecpvSlowlyTestFlowRate?: number | null;
  hecpvSlowlyTestMaxPressure?: number | null;
  hecpvSlowlyTestPressureAtNoFlow?: number | null;
  hecpvSlowlyTestCreepTestPressure?: number | null;

  // Fields from 'RECORD OF "ILPCV"'
  ilpcvRecordFlowRate?: number | null;
  ilpcvRecordMaxPressure?: number | null;
  ilpcvRecordPressureAtNoFlow?: number | null;
  ilpcvRecordCreepTestPressure?: number | null;

  // Footer fields
  nextTestDate?: string | null;
  placeOfPerformedTest?: string | null;
  controlPerformedBy?: string | null;
  approvedControlBy?: string | null;
}
