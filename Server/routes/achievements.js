import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createAchievement, getAchievements } from '../controllers/achievementController.js';

const router = express.Router();

router.use(protect);
router.get('/', getAchievements);
router.post('/', createAchievement);

export default router;
