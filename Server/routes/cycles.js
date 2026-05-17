import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { getCycleSettings, upsertCycleSettings } from '../controllers/cycleController.js';

const router = express.Router();

router.use(protect);
router.get('/', getCycleSettings);
router.put('/', requireRole('Admin'), upsertCycleSettings);

export default router;
