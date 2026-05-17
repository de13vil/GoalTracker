import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createCheckIn, getCheckIns, reviewCheckIn } from '../controllers/checkInController.js';

const router = express.Router();

router.use(protect);
router.get('/', getCheckIns);
router.post('/', createCheckIn);
router.patch('/:id/review', reviewCheckIn);

export default router;
