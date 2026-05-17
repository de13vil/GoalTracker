import express from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, me, register, listUsers, updateUserHierarchy } from '../controllers/authController.js';
import { forgotPassword, resetPassword } from '../controllers/passwordController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,
	standardHeaders: true,
	legacyHeaders: false,
});


router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.get('/me', protect, me);
router.post('/logout', protect, logout);
router.get('/users', protect, requireRole('Manager', 'Admin'), listUsers);
router.patch('/users/:id/hierarchy', protect, requireRole('Admin'), updateUserHierarchy);

export default router;
