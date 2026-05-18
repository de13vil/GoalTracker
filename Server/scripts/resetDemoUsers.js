import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from '../models/User.js';

const MONGO = process.env.MONGO_URI || process.env.MONGO;
if (!MONGO) {
  console.error('Set MONGO_URI in Server/.env before running this script');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    console.log('Connected to MongoDB, removing demo users...');
    const res = await User.deleteMany({ username: /^demo_/ });
    console.log('Deleted demo users count:', res.deletedCount);
  } catch (err) {
    console.error('Reset failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
