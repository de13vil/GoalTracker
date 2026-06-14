import Goal from '../models/Goal.js';
import User from '../models/User.js';
import Achievement from '../models/Achievement.js';
import CheckIn from '../models/CheckIn.js';
import { computeProgressScore } from '../utils/progressUtils.js';

const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
const hiddenGoalStatuses = ['Archived', 'Rejected'];

const getReportScope = async (user) => {
  if (user.role === 'Admin') {
    const users = await User.find().select('_id').lean();
    const userIds = users.map((item) => item._id);
    return { userFilter: {}, goalFilter: { employeeId: { $in: userIds }, status: { $nin: hiddenGoalStatuses } } };
  }

  const team = await User.find({ managerId: user.id }).select('_id').lean();
  const teamIds = team.map((item) => item._id);
  return {
    userFilter: { _id: { $in: teamIds } },
    goalFilter: { employeeId: { $in: teamIds }, status: { $nin: hiddenGoalStatuses } },
  };
};

export const getSummaryReport = async (req, res) => {
  try {
    const { userFilter, goalFilter } = await getReportScope(req.user);
    const [totalGoals, totalUsers, goals, employees, managers] = await Promise.all([
      Goal.countDocuments(goalFilter),
      User.countDocuments(userFilter),
      Goal.find(goalFilter).select('status weightage employeeId'),
      User.find({ ...userFilter, role: 'Employee' }).select('_id').lean(),
      User.find(req.user.role === 'Admin' ? { role: 'Manager' } : { _id: req.user.id }).select('_id').lean(),
    ]);
    const goalIds = goals.map((goal) => goal._id);
    const [totalAchievements, totalCheckIns, checkIns] = await Promise.all([
      Achievement.countDocuments({ goalId: { $in: goalIds } }),
      CheckIn.countDocuments({ goalId: { $in: goalIds } }),
      CheckIn.find({ goalId: { $in: goalIds } }).select('goalId managerId quarter').lean(),
    ]);

    const statusCounts = goals.reduce((acc, goal) => {
      acc[goal.status] = (acc[goal.status] || 0) + 1;
      return acc;
    }, {});

    const totalWeightage = goals.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0);

    const goalOwnerMap = new Map(goals.map((goal) => [String(goal._id), String(goal.employeeId)]));

    const employeeCheckins = new Map();
    checkIns.forEach((item) => {
      const ownerId = goalOwnerMap.get(String(item.goalId));
      if (!ownerId) return;
      const set = employeeCheckins.get(ownerId) || new Set();
      set.add(item.quarter);
      employeeCheckins.set(ownerId, set);
    });

    const employeesCompleted = employees.filter((emp) => (employeeCheckins.get(String(emp._id))?.size || 0) >= 4).length;
    const managersCompleted = managers.filter((mgr) => checkIns.some((item) => String(item.managerId) === String(mgr._id))).length;

    return res.json({
      summary: {
        totalGoals,
        totalUsers,
        totalAchievements,
        totalCheckIns,
        statusCounts,
        totalWeightage,
        employeesCompleted,
        managersCompleted,
      },
    });
  } catch (error) {
    console.error('Summary report error:', error);
    return res.status(500).json({ message: 'Server error while generating summary report' });
  }
};

export const exportGoalsCsv = async (req, res) => {
  try {
    const { goalFilter } = await getReportScope(req.user);
    const goals = await Goal.find(goalFilter).populate('employeeId', 'username fullName role').sort({ createdAt: -1 });

    const header = 'goalId,title,status,weightage,target,employeeUsername,employeeFullName,employeeRole,createdAt\n';
    const rows = goals.map((goal) => {
      const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
      return [
        goal._id,
        goal.title,
        goal.status,
        goal.weightage,
        goal.target,
        goal.employeeId?.username,
        goal.employeeId?.fullName,
        goal.employeeId?.role,
        goal.createdAt?.toISOString?.() || '',
      ].map(escape).join(',');
    }).join('\n');

    const csv = `${header}${rows}`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="goals-report.csv"');
    return res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    return res.status(500).json({ message: 'Server error while exporting CSV' });
  }
};

export const getCompletionReport = async (req, res) => {
  try {
    const { userFilter, goalFilter } = await getReportScope(req.user);
    const users = await User.find(userFilter).select('_id username fullName role department').lean();
    const goals = await Goal.find(goalFilter).select('employeeId status').lean();
    const goalIds = goals.map((goal) => goal._id);
    const checkIns = await CheckIn.find({ goalId: { $in: goalIds } }).select('goalId quarter managerId').lean();

    const goalOwnerMap = new Map(goals.map((goal) => [String(goal._id), String(goal.employeeId)]));

    const byUser = users.map((user) => {
      const userGoals = goals.filter((goal) => String(goal.employeeId) === String(user._id));
      const totalGoals = userGoals.length;
      const approvedGoals = userGoals.filter((goal) => goal.status === 'Approved').length;
      const submittedGoals = userGoals.filter((goal) => goal.status === 'Submitted').length;
      const completionRate = totalGoals > 0 ? Math.round((approvedGoals / totalGoals) * 100) : 0;
      const userCheckIns = checkIns.filter((item) => goalOwnerMap.get(String(item.goalId)) === String(user._id));
      const completedQuarters = [...new Set(userCheckIns.map((item) => item.quarter))].sort();
      const quartersDone = completedQuarters.length;
      const checkinCompletionRate = Math.round((quartersDone / 4) * 100);
      const reviewedQuarters = [...new Set(checkIns
        .filter((item) => String(item.managerId) === String(user._id))
        .map((item) => item.quarter))].sort();
      const reviewedCount = checkIns.filter((item) => String(item.managerId) === String(user._id)).length;

      return {
        userId: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        totalGoals,
        submittedGoals,
        approvedGoals,
        completionRate,
        checkinCompletionRate,
        completedQuarters,
        reviewedQuarters,
        reviewedCount,
      };
    });

    return res.json({ rows: byUser });
  } catch (error) {
    console.error('Completion report error:', error);
    return res.status(500).json({ message: 'Server error while generating completion report' });
  }
};

export const exportAchievementCsv = async (req, res) => {
  try {
    const { goalFilter } = await getReportScope(req.user);
    const visibleGoals = await Goal.find(goalFilter).select('_id').lean();
    const visibleGoalIds = visibleGoals.map((goal) => goal._id);
    const rowsData = await Achievement.find({ goalId: { $in: visibleGoalIds } })
      .populate({
        path: 'goalId',
        populate: { path: 'employeeId', select: 'username fullName role' },
      })
      .sort({ createdAt: -1 });

    const header = 'employeeUsername,employeeName,role,goalTitle,quarter,uom,metricDirection,plannedTarget,actualAchievement,completionDate,status,progressScore\n';
    const rows = rowsData.map((item) => {
      const goal = item.goalId;
      const employee = goal?.employeeId;
      const plannedTarget = Number(goal?.target || 0);
      const actual = Number(item.actual || 0);
      const progress = item.progressScore ?? computeProgressScore(goal, actual, item.completionDate);
      const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

      return [
        employee?.username,
        employee?.fullName,
        employee?.role,
        goal?.title,
        item.quarter,
        goal?.uom,
        goal?.metricDirection,
        plannedTarget,
        actual,
        item.completionDate?.toISOString?.().slice(0, 10) || '',
        item.status,
        progress,
      ].map(escape).join(',');
    }).join('\n');

    const csv = `${header}${rows}`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="achievement-report.csv"');
    return res.send(csv);
  } catch (error) {
    console.error('Achievement CSV export error:', error);
    return res.status(500).json({ message: 'Server error while exporting achievement report' });
  }
};

export const getAnalyticsReport = async (req, res) => {
  try {
    const { userFilter, goalFilter } = await getReportScope(req.user);
    const [users, goals, achievements, checkIns] = await Promise.all([
      User.find(userFilter).select('_id username fullName role department managerId').lean(),
      Goal.find(goalFilter).select('_id employeeId title status thrustArea uom metricDirection target deadline createdAt updatedAt').lean(),
      Achievement.find().select('goalId quarter actual status completionDate progressScore').lean(),
      CheckIn.find().select('goalId quarter managerId progressScore').lean(),
    ]);

    const userMap = new Map(users.map((user) => [String(user._id), user]));
    const goalMap = new Map(goals.map((goal) => [String(goal._id), goal]));
    const visibleGoalIds = new Set(goals.map((goal) => String(goal._id)));
    const scopedAchievements = achievements.filter((item) => visibleGoalIds.has(String(item.goalId)));
    const scopedCheckIns = checkIns.filter((item) => visibleGoalIds.has(String(item.goalId)));

    const trendRows = quarters.map((quarter) => {
      const quarterAchievements = scopedAchievements.filter((item) => item.quarter === quarter);
      const progressScores = quarterAchievements.map((item) => (
        item.progressScore ?? computeProgressScore(goalMap.get(String(item.goalId)), item.actual, item.completionDate)
      ));
      const plannedTarget = quarterAchievements.reduce((sum, item) => sum + Number(goalMap.get(String(item.goalId))?.target || 0), 0);
      const actualAchievement = quarterAchievements.reduce((sum, item) => sum + Number(item.actual || 0), 0);
      const averageProgress = progressScores.length
        ? Math.round(progressScores.reduce((sum, score) => sum + score, 0) / progressScores.length)
        : 0;

      return {
        quarter,
        plannedTarget,
        actualAchievement,
        averageProgress,
        updates: quarterAchievements.length,
      };
    });

    const distribution = goals.reduce((acc, goal) => {
      const thrustArea = goal.thrustArea || 'Unassigned';
      acc.byStatus[goal.status] = (acc.byStatus[goal.status] || 0) + 1;
      acc.byThrustArea[thrustArea] = (acc.byThrustArea[thrustArea] || 0) + 1;
      acc.byUom[goal.uom] = (acc.byUom[goal.uom] || 0) + 1;
      return acc;
    }, { byStatus: {}, byThrustArea: {}, byUom: {} });

    const departmentRows = [...new Set(users.map((user) => user.department || 'Unassigned'))].map((department) => {
      const departmentUsers = users.filter((user) => (user.department || 'Unassigned') === department);
      const departmentUserIds = new Set(departmentUsers.map((user) => String(user._id)));
      const departmentGoals = goals.filter((goal) => departmentUserIds.has(String(goal.employeeId)));
      const departmentCheckIns = scopedCheckIns.filter((item) => {
        const ownerId = goalMap.get(String(item.goalId))?.employeeId;
        return departmentUserIds.has(String(ownerId));
      });

      return {
        department,
        employees: departmentUsers.filter((user) => user.role === 'Employee').length,
        goals: departmentGoals.length,
        checkIns: departmentCheckIns.length,
        approvedGoals: departmentGoals.filter((goal) => goal.status === 'Approved').length,
      };
    });

    const managerRows = users
      .filter((user) => user.role === 'Manager')
      .map((manager) => {
        const team = users.filter((user) => String(user.managerId) === String(manager._id));
        const teamIds = new Set(team.map((user) => String(user._id)));
        const teamGoals = goals.filter((goal) => teamIds.has(String(goal.employeeId)));
        const teamGoalIds = new Set(teamGoals.map((goal) => String(goal._id)));
        const teamCheckIns = scopedCheckIns.filter((item) => teamGoalIds.has(String(item.goalId)));
        const reviewedCount = scopedCheckIns.filter((item) => String(item.managerId) === String(manager._id)).length;
        const expectedCheckIns = Math.max(1, team.length * quarters.length);

        return {
          managerId: manager._id,
          managerName: manager.fullName || manager.username,
          teamSize: team.length,
          teamGoals: teamGoals.length,
          reviewedCount,
          teamCheckInCompletionRate: Math.round((teamCheckIns.length / expectedCheckIns) * 100),
        };
      });

    const now = new Date();
    const staleSubmittedCutoff = new Date(now);
    staleSubmittedCutoff.setDate(staleSubmittedCutoff.getDate() - 7);
    const escalations = [];

    users.filter((user) => user.role === 'Employee').forEach((employee) => {
      const employeeGoals = goals.filter((goal) => String(goal.employeeId) === String(employee._id));
      if (employeeGoals.length === 0) {
        escalations.push({
          type: 'Goal submission',
          severity: 'High',
          ownerName: employee.fullName || employee.username,
          message: 'Employee has no goal sheet in the active scope.',
        });
      } else if (employeeGoals.some((goal) => ['Draft', 'Rejected'].includes(goal.status))) {
        escalations.push({
          type: 'Goal submission',
          severity: 'Medium',
          ownerName: employee.fullName || employee.username,
          message: 'Employee has goals still in draft or rework.',
        });
      }
    });

    goals
      .filter((goal) => goal.status === 'Submitted' && new Date(goal.updatedAt || goal.createdAt) < staleSubmittedCutoff)
      .forEach((goal) => {
        const owner = userMap.get(String(goal.employeeId));
        escalations.push({
          type: 'Manager approval',
          severity: 'Medium',
          ownerName: owner?.fullName || owner?.username || 'Unknown employee',
          message: `Submitted goal "${goal.title}" has been waiting more than 7 days.`,
        });
      });

    return res.json({
      analytics: {
        trendRows,
        distribution,
        departmentRows,
        managerRows,
        escalations,
      },
    });
  } catch (error) {
    console.error('Analytics report error:', error);
    return res.status(500).json({ message: 'Server error while generating analytics report' });
  }
};
