import express from 'express';
import {
	createGoal,
	createSharedGoals,
	getGoals,
	updateGoal,
	updateGoalStatus,
	unlockGoal,
	getAuditLogs,
} from '../controllers/goalController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getGoals);
router.post('/', createGoal);
router.post('/shared', requireRole('Manager', 'Admin'), createSharedGoals);
router.patch('/:id', updateGoal);
router.patch('/:id/status', updateGoalStatus);
router.patch('/:id/unlock', requireRole('Admin'), unlockGoal);
router.get('/:id/audit', getAuditLogs);

export default router;
