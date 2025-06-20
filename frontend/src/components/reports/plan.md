# Plan for MRN Report Refactor

## Backend Analysis (Completed)

- [x] Investigated `fuelingOperation.controller.ts` to understand MRN data processing.
- [x] Investigated `fuelIntakeRecord.controller.ts` and identified the new `getMrnReport` endpoint.
- [x] Investigated `mrnTransaction.service.ts` to understand the business logic.

## Frontend Refactor Plan

### 1. Explore Frontend Code

- [ ] Examine `FuelIntakeReport.tsx` to understand the current report generation logic.
- [ ] Identify the API calls responsible for fetching the MRN report data.
- [ ] Analyze the component's state and how it's used to render the report.

### 2. Adapt Frontend to New API

- [ ] Create a new API call in `mrnReportApi.ts` to fetch data from the `/api/fuel/mrn-report/:mrn` endpoint.
- [ ] Update the `fetchMrnBalances` function in `FuelIntakeReport.tsx` to use the new API call.
- [ ] Modify the component's state to store the data from the new API.

### 3. Update Report UI

- [ ] Update the main transaction table in `MrnReportUI.tsx` to display the new data correctly.
- [ ] Update the summary section in `MrnReportUI.tsx` to display the new balance and summary data.
- [ ] Ensure all fields in the report are correctly populated with the new data.

