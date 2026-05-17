import crypto from 'crypto';
import Goal from '../models/Goal.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import { isGoalSettingWindowOpen } from '../utils/cycleUtils.js';

const allowedStatuses = ['Draft', 'Submitted', 'Approved', 'Rejected'];
const allowedUoms = ['Numeric', 'Percentage', 'Timeline', 'Zero-based'];
const allowedMetricDirections = ['Min', 'Max'];

const normalizeGoal = (goal) => ({
  id: goal._id,
  employeeId: goal.employeeId,
  title: goal.title,
  description: goal.description,
  thrustArea: goal.thrustArea,
  uom: goal.uom,
  metricDirection: goal.metricDirection,
  target: goal.target,
  deadline: goal.deadline,
  weightage: goal.weightage,
  status: goal.status,
  approvedBy: goal.approvedBy,
  approvalDate: goal.approvalDate,
  isLocked: goal.isLocked,
  lockedAt: goal.lockedAt,
  lockedBy: goal.lockedBy,
  isShared: goal.isShared,
  sharedGroupId: goal.sharedGroupId,
  primaryOwnerId: goal.primaryOwnerId,
  createdAt: goal.createdAt,
  updatedAt: goal.updatedAt,
});

const toSnapshot = (goal) => ({
  title: goal.title,
  description: goal.description,
  thrustArea: goal.thrustArea,
  uom: goal.uom,
  metricDirection: goal.metricDirection,
  target: goal.target,
  deadline: goal.deadline,
  weightage: goal.weightage,
  status: goal.status,
  isLocked: goal.isLocked,
  approvedBy: goal.approvedBy,
  approvalDate: goal.approvalDate,
});

const logGoalAudit = async ({ goal, action, user, comment = '', before = null, after = null }) => {
  const changedFields = before && after
    ? Object.keys(after).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    : [];

  try {
    await AuditLog.create({
      goalId: goal._id,
      action,
      by: user?.id,
      role: user?.role,
      comment,
      before,
      after,
      changedFields,
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};

const canBypassCycleWindow = (user) => ['Manager', 'Admin'].includes(user?.role);

const getVisibleEmployeeIds = async (user) => {
  if (user?.role === 'Admin') {
    const users = await User.find().select('_id').lean();
    return users.map((item) => item._id);
  }
  if (user?.role === 'Manager') {
    const team = await User.find({ managerId: user.id }).select('_id').lean();
    return team.map((item) => item._id);
  }
  return [user.id];
};

const canManageGoal = async (user, goal) => {
  if (user?.role === 'Admin') return true;
  if (goal.employeeId.equals(user.id)) return true;
  if (user?.role !== 'Manager') return false;
  const owner = await User.findOne({ _id: goal.employeeId, managerId: user.id }).select('_id').lean();
  return Boolean(owner);
};

const validateGoalLimitAndWeight = async (employeeId, incomingWeightage, ignoreGoalId = null) => {
  if (Number.isNaN(Number(incomingWeightage)) || Number(incomingWeightage) < 10 || Number(incomingWeightage) > 100) {
    return { ok: false, message: 'Weightage must be between 10 and 100%' };
  }

  const filter = { employeeId };
  if (ignoreGoalId) filter._id = { $ne: ignoreGoalId };

  const existingGoals = await Goal.find(filter);

  if (existingGoals.length >= 8) {
    return { ok: false, message: 'Maximum 8 goals allowed per employee goal sheet' };
  }

  const totalWeightage = existingGoals.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0);
  if (totalWeightage + Number(incomingWeightage) > 100) {
    const remaining = Math.max(0, 100 - totalWeightage);
    return {
      ok: false,
      message: remaining === 0
        ? 'Your goal sheet is already at 100%. Reduce or remove weightage from an editable goal before creating another goal.'
        : `Only ${remaining}% weightage is remaining. Reduce this goal weightage or edit another goal first.`,
    };
  }

  return { ok: true };
};

export const createGoal = async (req, res) => {
  try {
    const {
      title,
      description,
      thrustArea,
      uom,
      metricDirection,
      target,
      deadline,
      weightage,
    } = req.body;

    const employeeId = req.user?.id;

    if (!employeeId || !title || !weightage) {
      return res.status(400).json({ message: 'Authenticated user, title, and weightage are required' });
    }

    const normalizedWeightage = Number(weightage);
    const normalizedTarget = target === undefined || target === '' ? 0 : Number(target);

    if (Number.isNaN(normalizedWeightage) || normalizedWeightage < 10 || normalizedWeightage > 100) {
      return res.status(400).json({ message: 'Weightage must be between 10 and 100%' });
    }

    if (Number.isNaN(normalizedTarget)) {
      return res.status(400).json({ message: 'Target must be a valid number' });
    }

    if (uom && !allowedUoms.includes(uom)) {
      return res.status(400).json({ message: 'Invalid UoM selected' });
    }

    if (metricDirection && !allowedMetricDirections.includes(metricDirection)) {
      return res.status(400).json({ message: 'Invalid metric direction selected' });
    }

    if (!canBypassCycleWindow(req.user)) {
      const isOpen = await isGoalSettingWindowOpen();
      if (!isOpen) {
        return res.status(400).json({ message: 'Goal setting window is currently closed' });
      }
    }

    const limitCheck = await validateGoalLimitAndWeight(employeeId, normalizedWeightage);
    if (!limitCheck.ok) {
      return res.status(400).json({ message: limitCheck.message });
    }

    const goal = await Goal.create({
      employeeId,
      title,
      description,
      thrustArea,
      uom,
      metricDirection,
      target: normalizedTarget,
      deadline,
      weightage: normalizedWeightage,
      status: 'Draft',
    });

    await logGoalAudit({
      goal,
      action: 'GOAL_CREATED',
      user: req.user,
      after: toSnapshot(goal),
    });

    return res.status(201).json({ message: 'Goal created successfully', goal: normalizeGoal(goal) });
  } catch (error) {
    console.error('Create goal error:', error);
    return res.status(500).json({ message: 'Server error while creating goal' });
  }
};

export const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      thrustArea,
      uom,
      metricDirection,
      target,
      deadline,
      weightage,
    } = req.body;

    const goal = await Goal.findById(id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    const isOwner = goal.employeeId.equals(req.user.id);
    const isPrivileged = ['Manager', 'Admin'].includes(req.user.role);
    const hasAccess = await canManageGoal(req.user, goal);
    if (!hasAccess || (!isOwner && !isPrivileged)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (goal.isLocked && req.user.role !== 'Admin') {
      return res.status(400).json({ message: 'Goal is locked. Only Admin can unlock before edits.' });
    }

    if (isOwner && req.user.role === 'Employee' && !['Draft', 'Rejected'].includes(goal.status)) {
      return res.status(400).json({ message: 'Employees can edit goals only before submission or after rework' });
    }

    const before = toSnapshot(goal);

    if (goal.isShared && isOwner && req.user.role === 'Employee') {
      if (weightage === undefined) {
        return res.status(400).json({ message: 'For shared goals, employees can adjust weightage only' });
      }

      const normalizedWeightage = Number(weightage);
      if (Number.isNaN(normalizedWeightage) || normalizedWeightage < 10) {
        return res.status(400).json({ message: 'Minimum weightage per individual goal is 10%' });
      }

      const otherGoals = await Goal.find({ employeeId: goal.employeeId, _id: { $ne: goal._id } });
      const totalWeightage = otherGoals.reduce((sum, item) => sum + Number(item.weightage || 0), 0);
      if (totalWeightage + normalizedWeightage > 100) {
        return res.status(400).json({ message: "This employee's goal sheet cannot exceed 100% weightage" });
      }

      goal.weightage = normalizedWeightage;
    } else {
      if (title !== undefined) goal.title = title;
      if (description !== undefined) goal.description = description;
      if (thrustArea !== undefined) goal.thrustArea = thrustArea;
      if (uom !== undefined) {
        if (!allowedUoms.includes(uom)) {
          return res.status(400).json({ message: 'Invalid UoM selected' });
        }
        goal.uom = uom;
      }
      if (metricDirection !== undefined) {
        if (!allowedMetricDirections.includes(metricDirection)) {
          return res.status(400).json({ message: 'Invalid metric direction selected' });
        }
        goal.metricDirection = metricDirection;
      }
      if (target !== undefined) {
        const normalizedTarget = Number(target);
        if (Number.isNaN(normalizedTarget)) {
          return res.status(400).json({ message: 'Target must be a valid number' });
        }
        goal.target = normalizedTarget;
      }
      if (deadline !== undefined) goal.deadline = deadline || null;

      if (weightage !== undefined) {
        const normalizedWeightage = Number(weightage);
        if (Number.isNaN(normalizedWeightage) || normalizedWeightage < 10) {
          return res.status(400).json({ message: 'Minimum weightage per individual goal is 10%' });
        }

        const otherGoals = await Goal.find({ employeeId: goal.employeeId, _id: { $ne: goal._id } });
        const totalWeightage = otherGoals.reduce((sum, item) => sum + Number(item.weightage || 0), 0);
        if (totalWeightage + normalizedWeightage > 100) {
          return res.status(400).json({ message: "This employee's goal sheet cannot exceed 100% weightage" });
        }

        goal.weightage = normalizedWeightage;
      }
    }

    await goal.save();

    await logGoalAudit({
      goal,
      action: 'GOAL_EDITED',
      user: req.user,
      before,
      after: toSnapshot(goal),
    });

    return res.json({ message: 'Goal updated successfully', goal: normalizeGoal(goal) });
  } catch (error) {
    console.error('Update goal error:', error);
    return res.status(500).json({ message: 'Server error while updating goal' });
  }
};

export const createSharedGoals = async (req, res) => {
  try {
    const {
      title,
      description,
      thrustArea,
      uom,
      metricDirection,
      target,
      deadline,
      recipients,
      primaryOwnerId,
    } = req.body;

    if (!['Manager', 'Admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only managers/admins can assign shared goals' });
    }

    if (!title || !uom || !Array.isArray(recipients) || recipients.length === 0 || !primaryOwnerId) {
      return res.status(400).json({ message: 'title, uom, primaryOwnerId and recipients are required' });
    }

    if (!allowedUoms.includes(uom)) {
      return res.status(400).json({ message: 'Invalid UoM selected' });
    }

    if (metricDirection && !allowedMetricDirections.includes(metricDirection)) {
      return res.status(400).json({ message: 'Invalid metric direction selected' });
    }

    const normalizedTarget = target === undefined || target === '' ? 0 : Number(target);
    if (Number.isNaN(normalizedTarget)) {
      return res.status(400).json({ message: 'Target must be a valid number' });
    }

    if (!recipients.some((recipient) => String(recipient.employeeId) === String(primaryOwnerId))) {
      return res.status(400).json({ message: 'Primary owner must be one of the shared goal recipients' });
    }

    const sharedGroupId = crypto.randomUUID();

    const createdGoals = [];
    for (const recipient of recipients) {
      const employeeId = recipient.employeeId;
      const weightage = Number(recipient.weightage || 0);

      if (!employeeId || Number.isNaN(weightage) || weightage < 10 || weightage > 100) {
        return res.status(400).json({ message: 'Each recipient requires valid employeeId and weightage >= 10' });
      }

      if (req.user.role === 'Manager') {
        const teamMember = await User.findOne({ _id: employeeId, managerId: req.user.id }).select('_id').lean();
        if (!teamMember) {
          return res.status(403).json({ message: `Recipient ${employeeId} is not in your team` });
        }
      }

      const check = await validateGoalLimitAndWeight(employeeId, weightage);
      if (!check.ok) {
        return res.status(400).json({ message: `Recipient ${employeeId}: ${check.message}` });
      }

      const goal = await Goal.create({
        employeeId,
        title,
        description,
        thrustArea,
        uom,
        metricDirection,
        target: normalizedTarget,
        deadline: deadline || null,
        weightage,
        status: 'Draft',
        isShared: true,
        sharedGroupId,
        primaryOwnerId,
      });

      await logGoalAudit({
        goal,
        action: 'SHARED_GOAL_ASSIGNED',
        user: req.user,
        after: toSnapshot(goal),
        comment: `Shared group ${sharedGroupId}`,
      });

      createdGoals.push(goal);
    }

    return res.status(201).json({
      message: 'Shared goals assigned successfully',
      sharedGroupId,
      goals: createdGoals.map(normalizeGoal),
    });
  } catch (error) {
    console.error('Create shared goals error:', error);
    return res.status(500).json({ message: 'Server error while creating shared goals' });
  }
};

export const getGoals = async (req, res) => {
  try {
    const visibleEmployeeIds = await getVisibleEmployeeIds(req.user);
    const filter = { employeeId: { $in: visibleEmployeeIds } };

    const goals = await Goal.find(filter).sort({ createdAt: -1 });
    return res.json({ goals: goals.map(normalizeGoal) });
  } catch (error) {
    console.error('Get goals error:', error);
    return res.status(500).json({ message: 'Server error while loading goals' });
  }
};

export const updateGoalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment = '', target, weightage } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid goal status' });
    }

    const goal = await Goal.findById(id);

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const isEmployee = req.user.role === 'Employee';
    const isPrivileged = ['Manager', 'Admin'].includes(req.user.role);
    const before = toSnapshot(goal);

    if (isEmployee) {
      if (!goal.employeeId.equals(req.user.id)) {
        return res.status(403).json({ message: 'You can only submit your own goals' });
      }

      if (goal.isLocked) {
        return res.status(400).json({ message: 'Goal is locked and cannot be submitted' });
      }

      if (!['Draft', 'Rejected'].includes(goal.status)) {
        return res.status(400).json({ message: 'Only draft or rejected goals can be submitted' });
      }

      if (status !== 'Submitted') {
        return res.status(403).json({ message: 'Employees can only submit goals' });
      }

      const employeeGoals = await Goal.find({ employeeId: req.user.id });
      const totalWeightage = employeeGoals.reduce((sum, item) => sum + Number(item.weightage || 0), 0);
      if (totalWeightage !== 100) {
        const delta = 100 - totalWeightage;
        return res.status(400).json({
          message: delta > 0
            ? `Goal sheet weightage is ${totalWeightage}%. Add or edit goals until it is exactly 100%. Remaining: ${delta}%.`
            : `Goal sheet weightage is ${totalWeightage}%. Reduce weightage by ${Math.abs(delta)}% before submitting.`,
        });
      }

      await Goal.updateMany(
        { employeeId: req.user.id, status: { $in: ['Draft', 'Rejected'] }, isLocked: false },
        { $set: { status: 'Submitted' }, $unset: { approvedBy: '', approvalDate: '' } }
      );

      goal.status = 'Submitted';
      goal.approvedBy = undefined;
      goal.approvalDate = undefined;
    } else if (isPrivileged) {
      const hasAccess = await canManageGoal(req.user, goal);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      if (goal.status !== 'Submitted') {
        return res.status(400).json({ message: 'Only submitted goals can be approved or rejected' });
      }

      if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(403).json({ message: 'Managers and admins can only approve or reject goals' });
      }

      if (target !== undefined) {
        const normalizedTarget = Number(target);
        if (Number.isNaN(normalizedTarget)) {
          return res.status(400).json({ message: 'Target must be a valid number' });
        }
        goal.target = normalizedTarget;
      }
      if (weightage !== undefined) {
        const normalizedWeightage = Number(weightage);
        if (Number.isNaN(normalizedWeightage) || normalizedWeightage < 10) {
          return res.status(400).json({ message: 'Minimum weightage per individual goal is 10%' });
        }

        const otherGoals = await Goal.find({ employeeId: goal.employeeId, _id: { $ne: goal._id } });
        const totalWeightage = otherGoals.reduce((sum, item) => sum + Number(item.weightage || 0), 0);
        if (totalWeightage + normalizedWeightage > 100) {
          return res.status(400).json({ message: "This employee's goal sheet cannot exceed 100% weightage" });
        }

        goal.weightage = normalizedWeightage;
      }

      if (status === 'Approved') {
        const allOtherGoals = await Goal.find({ employeeId: goal.employeeId, _id: { $ne: goal._id } });
        const projectedTotalWeightage = allOtherGoals.reduce((sum, item) => sum + Number(item.weightage || 0), 0) + Number(goal.weightage || 0);
        if (projectedTotalWeightage !== 100) {
          return res.status(400).json({
            message: `Cannot approve until this employee's goal sheet totals exactly 100%. Current total: ${projectedTotalWeightage}%.`,
          });
        }
      }

      goal.status = status;
      goal.approvedBy = req.user.id;
      goal.approvalDate = new Date();
      goal.isLocked = status === 'Approved';
      goal.lockedAt = status === 'Approved' ? new Date() : null;
      goal.lockedBy = status === 'Approved' ? req.user.id : null;
    } else {
      return res.status(403).json({ message: 'Forbidden for your role' });
    }

    await goal.save();

    await logGoalAudit({
      goal,
      action: status,
      user: req.user,
      comment,
      before,
      after: toSnapshot(goal),
    });

    return res.json({ message: 'Goal updated successfully', goal: normalizeGoal(goal) });
  } catch (error) {
    console.error('Update goal error:', error);
    return res.status(500).json({ message: 'Server error while updating goal' });
  }
};

export const unlockGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment = 'Admin unlocked goal' } = req.body;

    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only admin can unlock goals' });
    }

    const goal = await Goal.findById(id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    const before = toSnapshot(goal);

    goal.isLocked = false;
    goal.lockedAt = null;
    goal.lockedBy = null;
    goal.status = 'Rejected';

    await goal.save();

    await logGoalAudit({
      goal,
      action: 'GOAL_UNLOCKED',
      user: req.user,
      comment,
      before,
      after: toSnapshot(goal),
    });

    return res.json({ message: 'Goal unlocked successfully', goal: normalizeGoal(goal) });
  } catch (error) {
    console.error('Unlock goal error:', error);
    return res.status(500).json({ message: 'Server error while unlocking goal' });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const { id } = req.params;

    const goal = await Goal.findById(id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    const isOwner = goal.employeeId.equals(req.user.id);
    const isPrivileged = ['Manager', 'Admin'].includes(req.user.role);
    const hasAccess = await canManageGoal(req.user, goal);
    if (!hasAccess || (!isOwner && !isPrivileged)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const logs = await AuditLog.find({ goalId: id }).sort({ createdAt: -1 }).lean();
    return res.json({ logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({ message: 'Server error while loading audit logs' });
  }
};
