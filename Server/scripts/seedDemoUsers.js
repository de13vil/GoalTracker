import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const MONGO = process.env.MONGO_URI || process.env.MONGO;
if (!MONGO) {
  console.error('Set MONGO_URI in Server/.env before running this script');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    console.log('Connected to MongoDB, seeding demo users...');
    await User.deleteMany({ username: /demo_/ });

    const hash = (p) => bcrypt.hashSync(p, 10);

    const admin = await User.create({
      username: 'demo_admin',
      password: hash('AdminPass!23'),
      role: 'Admin',
      email: 'demo.admin@example.com',
      fullName: 'Demo Admin',
      isVerified: true,
    });

    const manager = await User.create({
      username: 'demo_manager',
      password: hash('ManagerPass!23'),
      role: 'Manager',
      email: 'demo.manager@example.com',
      fullName: 'Demo Manager',
      isVerified: true,
    });

    const employee = await User.create({
      username: 'demo_employee',
      password: hash('EmployeePass!23'),
      role: 'Employee',
      email: 'demo.employee@example.com',
      fullName: 'Demo Employee',
      managerId: manager._id,
      isVerified: true,
    });

    console.log('Seed complete. Credentials:');
    console.log('Admin -> username: demo_admin  password: AdminPass!23');
    console.log('Manager -> username: demo_manager  password: ManagerPass!23');
    console.log('Employee -> username: demo_employee  password: EmployeePass!23');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
