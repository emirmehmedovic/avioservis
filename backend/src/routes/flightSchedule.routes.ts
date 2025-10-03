import { Router } from 'express';
import {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getScheduleComparison,
  getMonthSchedules,
  bulkDeleteSchedules,
  getStatistics,
} from '../controllers/flightSchedule.controller';
import {
  importSchedulesFromCSV,
  downloadCSVTemplate,
  previewCSVImport,
} from '../controllers/flightSchedule.import';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/flight-schedules - Get all schedules with filters
router.get('/', getAllSchedules);

// GET /api/flight-schedules/import/template - Download CSV template
router.get('/import/template', downloadCSVTemplate);

// GET /api/flight-schedules/month/:year/:month - Get schedules for a specific month
router.get('/month/:year/:month', getMonthSchedules);

// GET /api/flight-schedules/comparison/:date - Get comparison for a specific date
router.get('/comparison/:date', getScheduleComparison);

// GET /api/flight-schedules/statistics/:period - Get period statistics (weekly/monthly)
router.get('/statistics/:period', getStatistics);

// GET /api/flight-schedules/:id - Get single schedule
router.get('/:id', getScheduleById);

// POST /api/flight-schedules - Create new schedule
router.post('/', createSchedule);

// POST /api/flight-schedules/import - Import schedules from CSV
router.post('/import', importSchedulesFromCSV);

// POST /api/flight-schedules/import/preview - Preview CSV import
router.post('/import/preview', previewCSVImport);

// DELETE /api/flight-schedules/bulk - Bulk delete schedules
router.delete('/bulk', bulkDeleteSchedules);

// PUT /api/flight-schedules/:id - Update schedule
router.put('/:id', updateSchedule);

// DELETE /api/flight-schedules/:id - Delete schedule (soft delete)
router.delete('/:id', deleteSchedule);

export default router;

