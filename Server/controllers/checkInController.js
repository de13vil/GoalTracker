import CheckIn from '../models/CheckIn.js';
import Goal from '../models/Goal.js';
import User from '../models/User.js';
import { isQuarterWindowOpen } from '../utils/cycleUtils.js';
import { computeProgressScore } from '../utils/progressUtils.js';
import { notifyUser } from '../utils/notificationService.js';

const normalizeCheckIn = (item) => {
  const goal = item.goalId && typeof item.goalId === 'object' ? item.goalId : null;
  const employee = goal?.employeeId && typeof goal.employeeId === 'object' ? goal.employeeId : null;

  return {
    id: item._id,
    goalId: goal?._id || item.goalId,
    goalTitle: goal?.title,
    employeeId: employee?._id || goal?.employeeId,
    employeeName: employee?.fullName || employee?.username,
    employeeRole: employee?.role,
    quarter: item.quarter,
    plannedTarget: item.plannedTarget,
    actualAchievement: item.actualAchievement,
    completionDate: item.completionDate,
    progressScore: item.progressScore,
    comment: item.comment,
    managerComment: item.managerComment,
    managerId: item.managerId,
    checkinDate: item.checkinDate,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

export const createCheckIn = async (req, res) => {
  try {
    const { goalId, quarter, plannedTarget = 0, actualAchievement = 0, completionDate = null, comment = '' } = req.body;

    if (!goalId || !quarter) {
      return res.status(400).json({ message: 'goalId and quarter are required' });
    }

    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      return res.status(400).json({ message: 'Quarter must be one of Q1, Q2, Q3, Q4' });
    }

    const goal = await Goal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const isOwner = goal.employeeId.equals(req.user.id);
    const isPrivileged = ['Manager', 'Admin'].includes(req.user.role);
    if (req.user.role === 'Manager' && !isOwner) {
      const teamMember = await User.findOne({ _id: goal.employeeId, managerId: req.user.id }).select('_id').lean();
      if (!teamMember) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!isPrivileged && goal.status !== 'Approved') {
      return res.status(400).json({ message: 'Check-ins can be logged only after the goal is approved' });
    }

    if (!isPrivileged) {
      const isWindowOpen = await isQuarterWindowOpen(quarter);
      if (!isWindowOpen) {
        return res.status(400).json({ message: `Check-in window is closed for ${quarter}` });
      }
    }

    const normalizedCompletionDate = completionDate ? new Date(completionDate) : null;
    const progressScore = computeProgressScore(goal, actualAchievement, normalizedCompletionDate, plannedTarget);

    const checkIn = await CheckIn.findOneAndUpdate(
      { goalId, quarter },
      {
        goalId,
        quarter,
        plannedTarget: Number(plannedTarget),
        actualAchievement: Number(actualAchievement),
        completionDate: normalizedCompletionDate,
        progressScore,
        comment,
        checkinDate: new Date(),
      },
      { upsert: true, new: true }
    ).populate({
      path: 'goalId',
      select: 'title employeeId target uom metricDirection deadline',
      populate: { path: 'employeeId', select: 'username fullName role' },
    });

    const managerId = goal.employeeId?.managerId || (await User.findById(goal.employeeId).select('managerId').lean())?.managerId;
    if (managerId) {
      await notifyUser(managerId, {
        type: 'checkin-saved',
        title: 'New check-in submitted',
        message: `${req.user.fullName || req.user.username} saved a ${quarter} check-in for ${goal.title}`,
        link: '/dashboard',
        metadata: { goalId: goal._id, checkInId: checkIn._id },
      });
    }

    return res.status(201).json({ message: 'Check-in saved', checkIn: normalizeCheckIn(checkIn) });
  } catch (error) {
    console.error('Create check-in error:', error);
    return res.status(500).json({ message: 'Server error while saving check-in' });
  }
};

export const getCheckIns = async (req, res) => {
  try {
    const { goalId } = req.query;
    const filter = {};
    if (goalId) filter.goalId = goalId;

    if (!['Manager', 'Admin'].includes(req.user.role)) {
      const ownGoals = await Goal.find({ employeeId: req.user.id }).select('_id');
      const ownGoalIds = ownGoals.map((g) => g._id);
      filter.goalId = filter.goalId ? filter.goalId : { $in: ownGoalIds };
    } else if (req.user.role === 'Manager') {
      const team = await User.find({ managerId: req.user.id }).select('_id').lean();
      const teamIds = team.map((item) => item._id);
      const teamGoals = await Goal.find({ employeeId: { $in: teamIds } }).select('_id');
      const teamGoalIds = teamGoals.map((g) => g._id);
      filter.goalId = filter.goalId && teamGoalIds.some((id) => String(id) === String(filter.goalId))
        ? filter.goalId
        : { $in: filter.goalId ? [] : teamGoalIds };
    }

    const checkIns = await CheckIn.find(filter)
      .populate({
        path: 'goalId',
        select: 'title employeeId target uom metricDirection deadline',
        populate: { path: 'employeeId', select: 'username fullName role' },
      })
      .sort({ createdAt: -1 });
    return res.json({ checkIns: checkIns.map(normalizeCheckIn) });
  } catch (error) {
    console.error('Get check-ins error:', error);
    return res.status(500).json({ message: 'Server error while loading check-ins' });
  }
};

export const reviewCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment = '' } = req.body;

    if (!['Manager', 'Admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only manager or admin can review check-ins' });
    }

    const existingCheckIn = await CheckIn.findById(id).populate('goalId', 'employeeId');
    if (!existingCheckIn) {
      return res.status(404).json({ message: 'Check-in not found' });
    }

    if (req.user.role === 'Manager') {
      const teamMember = await User.findOne({ _id: existingCheckIn.goalId?.employeeId, managerId: req.user.id }).select('_id').lean();
      if (!teamMember) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const checkIn = await CheckIn.findByIdAndUpdate(
      id,
      {
        managerComment: comment,
        managerId: req.user.id,
        checkinDate: new Date(),
      },
      { new: true }
    ).populate({
      path: 'goalId',
      select: 'title employeeId target uom metricDirection deadline',
      populate: { path: 'employeeId', select: 'username fullName role' },
    });

    if (!checkIn) {
      return res.status(404).json({ message: 'Check-in not found' });
    }

    const goalOwnerId = checkIn.goalId?.employeeId;
    if (goalOwnerId) {
      await notifyUser(goalOwnerId, {
        type: 'checkin-reviewed',
        title: 'Check-in reviewed',
        message: `${req.user.fullName || req.user.username} reviewed your ${checkIn.quarter} check-in.`,
        link: '/dashboard',
        metadata: { goalId: checkIn.goalId?._id, checkInId: checkIn._id },
      });
    }

    return res.json({ message: 'Check-in reviewed', checkIn: normalizeCheckIn(checkIn) });
  } catch (error) {
    console.error('Review check-in error:', error);
    return res.status(500).json({ message: 'Server error while reviewing check-in' });
  }
};
