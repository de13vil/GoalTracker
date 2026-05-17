import Achievement from '../models/Achievement.js';
import Goal from '../models/Goal.js';
import User from '../models/User.js';
import { isQuarterWindowOpen } from '../utils/cycleUtils.js';
import { computeProgressScore } from '../utils/progressUtils.js';

const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
const achievementStatuses = ['Not Started', 'On Track', 'Completed'];

const normalizeAchievement = (item) => {
  const goal = item.goalId && typeof item.goalId === 'object' ? item.goalId : null;
  const employee = goal?.employeeId && typeof goal.employeeId === 'object' ? goal.employeeId : null;

  return {
    id: item._id,
    goalId: goal?._id || item.goalId,
    goalTitle: goal?.title,
    plannedTarget: goal?.target,
    uom: goal?.uom,
    metricDirection: goal?.metricDirection,
    employeeId: employee?._id || goal?.employeeId,
    employeeName: employee?.fullName || employee?.username,
    actual: item.actual,
    status: item.status,
    quarter: item.quarter,
    completionDate: item.completionDate,
    progressScore: item.progressScore,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

export const createAchievement = async (req, res) => {
  try {
    const { goalId, actual, status = 'On Track', quarter, completionDate = null } = req.body;

    if (!goalId || actual === undefined || !quarter) {
      return res.status(400).json({ message: 'goalId, actual, and quarter are required' });
    }

    const goal = await Goal.findById(goalId);
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    if (!quarters.includes(quarter)) {
      return res.status(400).json({ message: 'Quarter must be one of Q1, Q2, Q3, Q4' });
    }

    if (!achievementStatuses.includes(status)) {
      return res.status(400).json({ message: 'Status must be Not Started, On Track, or Completed' });
    }

    if (!['Manager', 'Admin'].includes(req.user.role)) {
      const isWindowOpen = await isQuarterWindowOpen(quarter);
      if (!isWindowOpen) {
        return res.status(400).json({ message: `Achievement capture window is closed for ${quarter}` });
      }
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
      return res.status(400).json({ message: 'Achievements can be logged only after the goal is approved' });
    }

    if (goal.isShared && String(goal.primaryOwnerId) !== String(req.user.id) && !isPrivileged) {
      return res.status(403).json({ message: 'Only primary owner can update achievement for shared goals' });
    }

    const normalizedCompletionDate = completionDate ? new Date(completionDate) : null;
    const progressScore = computeProgressScore(goal, actual, normalizedCompletionDate);

    const achievement = await Achievement.findOneAndUpdate(
      { goalId: goal._id, quarter },
      {
        goalId: goal._id,
        actual: Number(actual),
        status,
        quarter,
        completionDate: normalizedCompletionDate,
        progressScore,
      },
      { upsert: true, new: true }
    ).populate({
      path: 'goalId',
      select: 'title employeeId target uom metricDirection deadline',
      populate: { path: 'employeeId', select: 'username fullName role' },
    });

    if (goal.isShared) {
      const linkedGoals = await Goal.find({ sharedGroupId: goal.sharedGroupId, _id: { $ne: goal._id } })
        .select('_id target uom metricDirection deadline');
      await Promise.all(linkedGoals.map((linkedGoal) => Achievement.findOneAndUpdate(
        { goalId: linkedGoal._id, quarter },
        {
          goalId: linkedGoal._id,
          actual: Number(actual),
          status,
          quarter,
          completionDate: normalizedCompletionDate,
          progressScore: computeProgressScore(linkedGoal, actual, normalizedCompletionDate),
        },
        { upsert: true, new: true }
      )));
    }

    return res.status(201).json({ message: 'Achievement saved', achievement: normalizeAchievement(achievement) });
  } catch (error) {
    console.error('Create achievement error:', error);
    return res.status(500).json({ message: 'Server error while creating achievement' });
  }
};

export const getAchievements = async (req, res) => {
  try {
    const { goalId } = req.query;

    let filter = {};
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

    const achievements = await Achievement.find(filter)
      .populate({
        path: 'goalId',
        select: 'title employeeId target uom metricDirection deadline',
        populate: { path: 'employeeId', select: 'username fullName role' },
      })
      .sort({ createdAt: -1 });
    return res.json({ achievements: achievements.map(normalizeAchievement) });
  } catch (error) {
    console.error('Get achievements error:', error);
    return res.status(500).json({ message: 'Server error while loading achievements' });
  }
};
