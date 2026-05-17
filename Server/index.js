import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import goalRoutes from './routes/goals.js';
import achievementRoutes from './routes/achievements.js';
import checkInRoutes from './routes/checkins.js';
import reportRoutes from './routes/reports.js';
import cycleRoutes from './routes/cycles.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/checkins', checkInRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/cycles', cycleRoutes);

app.get('/', (req, res) => {
  res.send('Backend is running with MongoDB!');
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

startServer();
