import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendOTPEmail } from '../utils/mailer.js';

const sanitizeUser = (user) => ({
  id: user._id,
  username: user.username,
  role: user.role,
  email: user.email,
  fullName: user.fullName,
  department: user.department,
  managerId: user.managerId,
  lastLoginAt: user.lastLoginAt,
});

const signToken = (user) => jwt.sign(
  { id: user._id.toString(), role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};

export const register = async (req, res) => {
  try {
    const { username, password, email, fullName, role, registrationKey, otp } = req.body;
    const allowedRoles = ['Employee', 'Manager', 'Admin'];
    const selectedRole = role || 'Employee';

    if (otp) {
      const pendingUser = await User.findOne({ username, email, isVerified: false });
      if (!pendingUser) {
        return res.status(400).json({ message: 'No pending registration found or already verified.' });
      }
      if (pendingUser.otp !== otp || !pendingUser.otpExpires || pendingUser.otpExpires < new Date()) {
        return res.status(400).json({ message: 'Invalid or expired OTP.' });
      }
      pendingUser.isVerified = true;
      pendingUser.otp = undefined;
      pendingUser.otpExpires = undefined;
      await pendingUser.save();
      return res.status(201).json({ message: 'User registered successfully', user: sanitizeUser(pendingUser) });
    }

    // Registration key check for Manager/Admin
    if ((selectedRole === 'Manager' || selectedRole === 'Admin')) {
      const validKey = String(process.env.REGISTRATION_KEY || 'MANAGERADMINKEY').trim();
      const providedKey = String(registrationKey || '').trim();
      if (!providedKey || providedKey !== validKey) {
        return res.status(403).json({ message: 'Invalid registration key for Manager/Admin' });
      }
    }

    if (!username || !password || !email || !fullName) {
      return res.status(400).json({ message: 'Full name, email, username, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    if (!allowedRoles.includes(selectedRole)) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    // Step 1: Generate and send OTP
    const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry
    // Save a pending user (not verified)
    await User.create({
      username,
      password: await bcrypt.hash(password, 10),
      role: selectedRole,
      email,
      fullName,
      otp: generatedOTP,
      otpExpires,
      isVerified: false,
    });
    await sendOTPEmail(email, generatedOTP);
    return res.status(200).json({ message: 'OTP sent to your email. Please verify to complete registration.' });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Server error while registering user' });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Username, password, and role are required' });
    }

    const user = await User.findOne({ username, role });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials or role' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials or role' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);
    res.clearCookie('goaltracker_token', cookieOptions);

    return res.json({ message: 'Login successful', user: sanitizeUser(user), token });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error while logging in' });
  }
};

export const me = async (req, res) => {
  try {
    return res.json({ user: sanitizeUser(req.user) });
  } catch (error) {
    console.error('Me error:', error);
    return res.status(500).json({ message: 'Server error while loading session' });
  }
};

export const logout = async (req, res) => {
  res.clearCookie('goaltracker_token', cookieOptions);

  return res.json({ message: 'Logged out successfully' });
};

export const listUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.user.role === 'Manager') filter.managerId = req.user.id;

    const users = await User.find(filter)
      .select('_id username role fullName email department managerId')
      .sort({ fullName: 1, username: 1 })
      .lean();

    return res.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ message: 'Server error while loading users' });
  }
};

export const updateUserHierarchy = async (req, res) => {
  try {
    const { id } = req.params;
    const { department, managerId } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (department !== undefined) user.department = department;
    if (managerId !== undefined) user.managerId = managerId || null;
    await user.save();

    return res.json({
      message: 'Hierarchy updated',
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Update user hierarchy error:', error);
    return res.status(500).json({ message: 'Server error while updating hierarchy' });
  }
};
