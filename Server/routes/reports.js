import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { getSummaryReport, exportGoalsCsv, getCompletionReport, exportAchievementCsv, getAnalyticsReport } from '../controllers/reportController.js';

const router = express.Router();

router.use(protect, requireRole('Manager', 'Admin'));
router.get('/summary', getSummaryReport);
router.get('/completion', getCompletionReport);
router.get('/analytics', getAnalyticsReport);
router.get('/export/csv', exportGoalsCsv);
router.get('/export/achievement-csv', exportAchievementCsv);

export default router;
