import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, ClipboardList, LogOut, Plus, Target, TrendingUp, XCircle } from 'lucide-react';
import { createGoal, createSharedGoals, editGoal, fetchGoals, unlockGoal, updateGoalStatus, fetchGoalAudit } from '../api/goals';
import { fetchUsers, logoutUser, updateUserHierarchy } from '../api/auth';
import { createAchievement, fetchAchievements } from '../api/achievements';
import { createCheckIn, fetchCheckIns, reviewCheckIn } from '../api/checkins';
import { downloadAchievementCsv, downloadGoalsCsv, fetchAnalyticsReport, fetchCompletionReport, fetchSummaryReport } from '../api/reports';
import { fetchCycleSettings, updateCycleSettings } from '../api/cycles';
import { fetchNotifications, markNotificationRead } from '../api/notifications';

const initialForm = {
  title: '',
  description: '',
  thrustArea: '',
  uom: 'Numeric',
  metricDirection: 'Min',
  target: '',
  deadline: '',
  weightage: '',
};

const thrustAreaOptions = [
  'Financial',
  'Customer',
  'Operations',
  'People',
  'Innovation',
  'Compliance',
  'Safety',
];

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [goals, setGoals] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [report, setReport] = useState(null);
  const [analyticsReport, setAnalyticsReport] = useState(null);
  const [completionRows, setCompletionRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAchievement, setSavingAchievement] = useState(false);
  const [savingCheckIn, setSavingCheckIn] = useState(false);
  const [savingSharedGoals, setSavingSharedGoals] = useState(false);
  const [reviewingCheckInId, setReviewingCheckInId] = useState('');
  const [actioningGoalId, setActioningGoalId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editGoalId, setEditGoalId] = useState('');
  const [editGoalForm, setEditGoalForm] = useState(initialForm);
  const [users, setUsers] = useState([]);
  const [cycleSettings, setCycleSettings] = useState(null);
  const [savingCycle, setSavingCycle] = useState(false);
  const [savingHierarchy, setSavingHierarchy] = useState(false);
  const [exportingCsv, setExportingCsv] = useState('');
  const [sharedGoalForm, setSharedGoalForm] = useState({
    title: '',
    description: '',
    thrustArea: '',
    uom: 'Numeric',
    metricDirection: 'Min',
    target: '',
    deadline: '',
    primaryOwnerId: '',
  });
  const [sharedGoalRecipients, setSharedGoalRecipients] = useState([]);
  const [sharedGoalWeights, setSharedGoalWeights] = useState({});
  const [reviewComments, setReviewComments] = useState({});
  const [unlockingGoalId, setUnlockingGoalId] = useState('');
  const [hierarchyForm, setHierarchyForm] = useState({ userId: '', department: '', managerId: '' });
  const [achievementForm, setAchievementForm] = useState({ goalId: '', quarter: 'Q1', actual: '', completionDate: '', status: 'On Track' });
  const [checkInForm, setCheckInForm] = useState({ goalId: '', quarter: 'Q1', plannedTarget: '', actualAchievement: '', completionDate: '', comment: '' });

  const isEmployee = user?.role === 'Employee';
  const isManager = user?.role === 'Manager';
  const isAdmin = user?.role === 'Admin';
  const isPrivileged = ['Manager', 'Admin'].includes(user?.role);
  const currentUserId = String(user?.id || user?._id || '');
  const sheetOwnerName = user?.fullName || user?.username || 'this employee';
  const activeGoals = useMemo(() => goals.filter((goal) => goal.status !== 'Archived'), [goals]);
  const archivedGoals = useMemo(
    () => goals.filter((goal) => String(goal.employeeId || '') === currentUserId && goal.status === 'Archived'),
    [currentUserId, goals]
  );
  const dashboardGoals = useMemo(() => {
    if (!isEmployee) return activeGoals;
    return activeGoals.filter((goal) => String(goal.employeeId || '') === currentUserId);
  }, [activeGoals, currentUserId, isEmployee]);
  const pendingReviews = useMemo(() => dashboardGoals.filter((goal) => goal.status === 'Submitted'), [dashboardGoals]);
  const completionAverage = useMemo(() => {
    if (!completionRows.length) return 0;
    const sum = completionRows.reduce((acc, row) => acc + Number(row.completionRate || 0), 0);
    return Math.round(sum / completionRows.length);
  }, [completionRows]);
  const unreadNotificationCount = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications]
  );
  const selectedAchievementGoalId = achievementForm.goalId || dashboardGoals[0]?.id || '';
  const selectedCheckInGoalId = checkInForm.goalId || dashboardGoals[0]?.id || '';
  const selectedAchievementGoal = dashboardGoals.find((goal) => goal.id === selectedAchievementGoalId);
  const selectedCheckInGoal = dashboardGoals.find((goal) => goal.id === selectedCheckInGoalId);
  const getUserId = (item) => String(item?.id || item?._id || '');
  const eligibleSharedUsers = users.filter((item) => item.role === 'Employee');
  const goalSheetWeightage = useMemo(() => {
    if (!isEmployee) return 0;
    return dashboardGoals.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0);
  }, [dashboardGoals, isEmployee]);
  const goalSheetDelta = 100 - goalSheetWeightage;
  const canSubmitGoalSheet = goalSheetWeightage === 100;
  const newGoalWeightage = Number(form.weightage || 0);
  const createGoalRemaining = Math.max(0, goalSheetDelta);
  const canCreateMoreGoals = !isEmployee || createGoalRemaining >= 10;
  const newGoalExceedsRemaining = isEmployee && form.weightage !== '' && newGoalWeightage > createGoalRemaining;
  const projectedGoalSheetWeightage = goalSheetWeightage + (Number.isNaN(newGoalWeightage) ? 0 : newGoalWeightage);
  const employeeGoalCount = isEmployee ? dashboardGoals.length : 0;
  const canCreateGoalCount = !isEmployee || employeeGoalCount < 8;

  const roleMeta = isEmployee
    ? {
        title: 'Employee Workspace',
        subtitle: 'Create goals, submit for review, and track your performance.',
        badgeClass: 'text-blue-700 bg-blue-50 border-blue-200',
      }
    : isManager
      ? {
          title: 'Manager Command Center',
          subtitle: 'Review team goals, provide check-in feedback, and monitor completion.',
          badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        }
      : {
          title: 'Admin Control Tower',
          subtitle: 'Oversee organization-wide goals, reports, and completion metrics.',
          badgeClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
        };

  const stats = useMemo(() => {
    const total = dashboardGoals.length;
    const submitted = dashboardGoals.filter((goal) => goal.status === 'Submitted').length;
    const approved = dashboardGoals.filter((goal) => goal.status === 'Approved').length;
    return { total, submitted, approved };
  }, [dashboardGoals]);

  const statCards = [
    { label: 'Total Goals', value: stats.total, icon: Target },
    { label: 'Submitted', value: stats.submitted, icon: ClipboardList },
    isPrivileged
      ? { label: 'Pending Review', value: pendingReviews.length, icon: ClipboardList }
      : { label: 'Approved', value: stats.approved, icon: TrendingUp },
    isPrivileged
      ? { label: 'Avg Completion', value: `${completionAverage}%`, icon: TrendingUp }
      : { label: 'Approved', value: stats.approved, icon: TrendingUp },
  ];

  const roleTabs = isEmployee
    ? [
        { key: 'goals', label: 'Goals' },
        { key: 'achievements', label: 'Achievements' },
        { key: 'checkins', label: 'Check-ins' },
      ]
    : [
        { key: 'reviews', label: 'Reviews' },
        { key: 'checkins', label: 'Check-ins' },
        { key: 'reports', label: 'Reports' },
      ];

  const viewMeta = {
    goals: {
      title: isEmployee ? 'Your Goals' : isManager ? 'Team Goals' : 'Organization Goals',
      description: isEmployee
        ? 'Create and manage the goals on your own page.'
        : 'Review goal sheets and individual goal details on this page.',
    },
    achievements: {
      title: 'Achievements',
      description: 'Log actual progress for goals on a dedicated page.',
    },
    reviews: {
      title: isManager ? 'Reviews' : 'Organization Reviews',
      description: isManager
        ? 'Handle manager approvals and team feedback here.'
        : 'Approve, reject, and unlock organization-wide goal reviews here.',
    },
    checkins: {
      title: 'Check-ins',
      description: 'Keep planned vs actual updates and comments in one dedicated page.',
    },
    reports: {
      title: 'Reports',
      description: 'Open exports, analytics, cycle settings, and hierarchy tools on this page.',
    },
  };

  const defaultView = isEmployee ? 'goals' : 'reviews';
  const allowedViews = roleTabs.map((tab) => tab.key);
  const activeView = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    const pathView = parts[1];
    const tabQuery = new URLSearchParams(location.search).get('tab');

    if (allowedViews.includes(pathView)) return pathView;
    if (tabQuery && allowedViews.includes(tabQuery)) return tabQuery;
    return defaultView;
  }, [allowedViews, defaultView, location.pathname, location.search]);

  const loadGoals = useCallback(async () => {
    const data = await fetchGoals();
    return data.goals || [];
  }, []);

  const loadAchievements = useCallback(async () => {
    const data = await fetchAchievements();
    return data.achievements || [];
  }, []);

  const loadCheckIns = useCallback(async () => {
    const data = await fetchCheckIns();
    return data.checkIns || [];
  }, []);

  const loadReport = useCallback(async () => {
    if (!isPrivileged) return null;
    const data = await fetchSummaryReport();
    return data.summary || null;
  }, [isPrivileged]);

  const loadCompletionReport = useCallback(async () => {
    if (!isPrivileged) return [];
    const data = await fetchCompletionReport();
    return data.rows || [];
  }, [isPrivileged]);

  const loadAnalyticsReport = useCallback(async () => {
    if (!isPrivileged) return null;
    const data = await fetchAnalyticsReport();
    return data.analytics || null;
  }, [isPrivileged]);

  const loadUsers = useCallback(async () => {
    if (!isPrivileged) return [];
    const data = await fetchUsers();
    return data.users || [];
  }, [isPrivileged]);

  const loadCycleSettings = useCallback(async () => {
    if (!isPrivileged) return null;
    const data = await fetchCycleSettings();
    return data.settings || null;
  }, [isPrivileged]);

  const loadNotifications = useCallback(async () => {
    const data = await fetchNotifications();
    return data.notifications || [];
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [goalItems, achievementItems, checkInItems, notificationItems, reportData, completionData, analyticsData, userItems, cycleData] = await Promise.all([
          loadGoals(),
          loadAchievements(),
          loadCheckIns(),
          loadNotifications(),
          loadReport(),
          loadCompletionReport(),
          loadAnalyticsReport(),
          loadUsers(),
          loadCycleSettings(),
        ]);
        setGoals(goalItems);
        setAchievements(achievementItems);
        setCheckIns(checkInItems);
        setNotifications(notificationItems);
        setReport(reportData);
        setCompletionRows(completionData || []);
        setAnalyticsReport(analyticsData || null);
        setUsers(userItems || []);
        setCycleSettings(cycleData || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [loadAchievements, loadAnalyticsReport, loadCheckIns, loadCompletionReport, loadCycleSettings, loadGoals, loadNotifications, loadReport, loadUsers, navigate, user]);

  useEffect(() => {
    if (!user) return;
    const normalizedPath = `/dashboard/${activeView}`;
    if (location.pathname !== normalizedPath || location.search) {
      navigate(normalizedPath, { replace: true });
    }
  }, [activeView, location.pathname, location.search, navigate, user]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.title || !form.weightage) {
      setError('Goal title and weightage are required');
      return;
    }

    const weightage = Number(form.weightage);
    const target = form.target === '' ? 0 : Number(form.target);

    if (Number.isNaN(weightage) || weightage < 10 || weightage > 100) {
      setError('Weightage must be between 10 and 100');
      return;
    }

    if (isEmployee && employeeGoalCount >= 8) {
      setError('Maximum 8 goals are allowed per employee in this challenge.');
      return;
    }

    if (isEmployee && goalSheetDelta < 10) {
      setError(
        goalSheetDelta <= 0
          ? `${sheetOwnerName}'s goal sheet is already at 100%. Edit an existing draft/rework goal to free weightage before creating another goal.`
          : `Only ${goalSheetDelta}% is remaining for ${sheetOwnerName}, but each goal needs at least 10%. Edit existing goal weightage first.`
      );
      return;
    }

    if (isEmployee && weightage > goalSheetDelta) {
      setError(`Only ${goalSheetDelta}% weightage is remaining for ${sheetOwnerName}. Use ${goalSheetDelta}% or edit another goal first.`);
      return;
    }

    try {
      setSaving(true);
      await createGoal({
        title: form.title,
        description: form.description,
        thrustArea: form.thrustArea,
        uom: form.uom,
        metricDirection: form.metricDirection,
        target,
        deadline: form.deadline || null,
        weightage,
        status: 'Draft',
      });
      setForm(initialForm);
      setSuccess('Goal created successfully');
      const goalItems = await loadGoals();
      setGoals(goalItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (goalId, status) => {
    setError('');
    setSuccess('');

    if (isEmployee && status === 'Submitted' && !canSubmitGoalSheet) {
      setError(
        goalSheetWeightage < 100
          ? `${sheetOwnerName}'s goal sheet is ${goalSheetWeightage}%. Add or edit goals until total weightage is exactly 100%. Remaining: ${goalSheetDelta}%.`
          : `${sheetOwnerName}'s goal sheet is ${goalSheetWeightage}%. Reduce weightage by ${Math.abs(goalSheetDelta)}% before submitting.`
      );
      return;
    }

    try {
      const comment = isPrivileged && (status === 'Approved' || status === 'Rejected')
        ? reviewComments[goalId] || ''
        : '';
      setActioningGoalId(goalId);
      await updateGoalStatus(goalId, status, comment);
      setReviewComments((prev) => ({ ...prev, [goalId]: '' }));
      setSuccess(
        status === 'Submitted'
          ? 'Goal sheet submitted for review'
          : status === 'Rejected'
            ? 'Goal returned for rework'
            : status === 'Archived'
              ? 'Goal archived and removed from your active sheet'
              : `Goal ${status.toLowerCase()} successfully`
      );
      const goalItems = await loadGoals();
      setGoals(goalItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setActioningGoalId('');
    }
  };

  const startGoalEdit = (goal) => {
    setEditGoalId(goal.id);
    setEditGoalForm({
      title: goal.title || '',
      description: goal.description || '',
      thrustArea: goal.thrustArea || '',
      uom: goal.uom || 'Numeric',
      metricDirection: goal.metricDirection || 'Min',
      target: goal.target ?? '',
      deadline: goal.deadline ? new Date(goal.deadline).toISOString().slice(0, 10) : '',
      weightage: goal.weightage ?? '',
    });
  };

  const handleEditGoalChange = (e) => {
    setEditGoalForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const refreshGoals = async () => {
    const goalItems = await loadGoals();
    setGoals(goalItems);
    return goalItems;
  };

  const handleEditGoalSave = async (goal, overridePayload = null) => {
    try {
      setError('');
      setSuccess('');
      const payload = overridePayload || (goal.isShared && isEmployee
        ? { weightage: Number(editGoalForm.weightage) }
        : {
            ...editGoalForm,
            target: Number(editGoalForm.target || 0),
            deadline: editGoalForm.deadline || null,
            weightage: Number(editGoalForm.weightage),
          });

      await editGoal(goal.id, payload);
      setEditGoalId('');
      setSuccess('Goal updated successfully');
      await refreshGoals();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAchievementChange = (e) => {
    setAchievementForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCheckInChange = (e) => {
    setCheckInForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAchievementSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedAchievementGoalId || achievementForm.actual === '') {
      setError('Select a goal and enter actual achievement');
      return;
    }

    try {
      setSavingAchievement(true);
      await createAchievement({
        goalId: selectedAchievementGoalId,
        quarter: achievementForm.quarter,
        actual: Number(achievementForm.actual),
        completionDate: achievementForm.completionDate || null,
        status: achievementForm.status,
      });
      const achievementItems = await loadAchievements();
      setAchievements(achievementItems);
      setSuccess('Achievement logged successfully');
      setAchievementForm((prev) => ({ ...prev, actual: '', completionDate: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAchievement(false);
    }
  };

  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedCheckInGoalId || !checkInForm.quarter) {
      setError('Select a goal and quarter for check-in');
      return;
    }

    try {
      setSavingCheckIn(true);
      await createCheckIn({
        goalId: selectedCheckInGoalId,
        quarter: checkInForm.quarter,
        plannedTarget: Number(selectedCheckInGoal?.target || 0),
        actualAchievement: Number(checkInForm.actualAchievement || 0),
        completionDate: checkInForm.completionDate || null,
        comment: checkInForm.comment,
      });
      const checkInItems = await loadCheckIns();
      setCheckIns(checkInItems);
      setSuccess('Quarterly check-in saved');
      setCheckInForm((prev) => ({ ...prev, plannedTarget: '', actualAchievement: '', completionDate: '', comment: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCheckIn(false);
    }
  };

  const handleCsvExport = async () => {
    try {
      setError('');
      setExportingCsv('goals');
      const blob = await downloadGoalsCsv();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'goals-report.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExportingCsv('');
    }
  };

  const handleAchievementCsvExport = async () => {
    try {
      setError('');
      setExportingCsv('achievements');
      const blob = await downloadAchievementCsv();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'achievement-report.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExportingCsv('');
    }
  };

  const toggleSharedGoalRecipient = (userId) => {
    setSharedGoalRecipients((prev) => {
      const isSelected = prev.includes(userId);
      const next = isSelected ? prev.filter((id) => id !== userId) : [...prev, userId];
      if (isSelected && sharedGoalForm.primaryOwnerId === userId) {
        setSharedGoalForm((formState) => ({ ...formState, primaryOwnerId: '' }));
      }
      if (!isSelected) {
        setSharedGoalWeights((weights) => ({ ...weights, [userId]: weights[userId] || '10' }));
      }
      return next;
    });
  };

  const handleSharedGoalSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSavingSharedGoals(true);

    try {
      if (!sharedGoalForm.title.trim()) {
        setError('Shared goal title is required');
        return;
      }

      const recipients = sharedGoalRecipients.map((employeeId) => ({
        employeeId,
        weightage: Number(sharedGoalWeights[employeeId] || 0),
      }));

      const invalidRecipient = recipients.find(
        (recipient) => Number.isNaN(recipient.weightage) || recipient.weightage < 10 || recipient.weightage > 100
      );
      if (invalidRecipient) {
        setError('Each selected recipient must have a weightage between 10 and 100');
        return;
      }

      if (!sharedGoalForm.primaryOwnerId || recipients.length === 0) {
        setError('Select recipients and a primary owner for the shared goal');
        return;
      }

      await createSharedGoals({
        title: sharedGoalForm.title,
        description: sharedGoalForm.description,
        thrustArea: sharedGoalForm.thrustArea,
        uom: sharedGoalForm.uom,
        metricDirection: sharedGoalForm.metricDirection,
        target: Number(sharedGoalForm.target || 0),
        deadline: sharedGoalForm.deadline || null,
        primaryOwnerId: sharedGoalForm.primaryOwnerId,
        recipients,
      });

      setSuccess('Shared goals assigned successfully');
      setSharedGoalForm({
        title: '',
        description: '',
        thrustArea: '',
        uom: 'Numeric',
        metricDirection: 'Min',
        target: '',
        deadline: '',
        primaryOwnerId: '',
      });
      setSharedGoalRecipients([]);
      setSharedGoalWeights({});
      const goalItems = await loadGoals();
      setGoals(goalItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingSharedGoals(false);
    }
  };

  const handleUnlockGoal = async (goalId) => {
    try {
      const comment = window.prompt('Unlock comment', 'Admin unlocked for correction');
      if (comment === null) return;
      setUnlockingGoalId(goalId);
      await unlockGoal(goalId, comment);
      setSuccess('Goal unlocked successfully');
      const goalItems = await loadGoals();
      setGoals(goalItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setUnlockingGoalId('');
    }
  };

  const handleArchiveGoal = async (goalId) => {
    await handleStatusChange(goalId, 'Archived');
  };

  const handleCycleSave = async () => {
    if (!isAdmin || !cycleSettings) return;
    try {
      setSavingCycle(true);
      await updateCycleSettings(cycleSettings);
      setSuccess('Cycle settings updated');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCycle(false);
    }
  };

  const handleHierarchySave = async () => {
    if (!hierarchyForm.userId) {
      setError('Select a user first');
      return;
    }

    try {
      setSavingHierarchy(true);
      await updateUserHierarchy(hierarchyForm.userId, {
        department: hierarchyForm.department,
        managerId: hierarchyForm.managerId || null,
      });
      setSuccess('User hierarchy updated');
      const userItems = await loadUsers();
      setUsers(userItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingHierarchy(false);
    }
  };

  const handleReviewCheckIn = async (checkInId) => {
    try {
      const comment = window.prompt('Manager review comment', '');
      if (comment === null) return;
      setReviewingCheckInId(checkInId);
      await reviewCheckIn(checkInId, comment);
      const checkInItems = await loadCheckIns();
      setCheckIns(checkInItems);
      setSuccess('Check-in reviewed successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setReviewingCheckInId('');
    }
  };

  const [auditMap, setAuditMap] = useState({});

  const toggleAudit = async (goalId) => {
    if (auditMap[goalId]) {
      setAuditMap((m) => ({ ...m, [goalId]: null }));
      return;
    }

    try {
      const data = await fetchGoalAudit(goalId);
      setAuditMap((m) => ({ ...m, [goalId]: data.logs }));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.readAt) {
        await markNotificationRead(notification.id);
      }
      if (notification.link) {
        navigate(notification.link);
      }
      const refreshed = await loadNotifications();
      setNotifications(refreshed);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // ignore logout errors and still clear local session state
    }
    onLogout?.();
    navigate('/');
  };

  const dashboardContext = {
    user,
    currentUserId,
    isEmployee,
    isManager,
    isAdmin,
    isPrivileged,
    loading,
    goals: dashboardGoals,
    achievements,
    checkIns,
    notifications,
    report,
    analyticsReport,
    completionRows,
    savingAchievement,
    savingCheckIn,
    saving,
    savingSharedGoals,
    reviewingCheckInId,
    actioningGoalId,
    error,
    success,
    form,
    setForm,
    editGoalId,
    setEditGoalId,
    editGoalForm,
    setEditGoalForm,
    users,
    cycleSettings,
    setCycleSettings,
    savingCycle,
    savingHierarchy,
    exportingCsv,
    sharedGoalForm,
    setSharedGoalForm,
    sharedGoalRecipients,
    setSharedGoalRecipients,
    sharedGoalWeights,
    setSharedGoalWeights,
    reviewComments,
    setReviewComments,
    unlockingGoalId,
    hierarchyForm,
    setHierarchyForm,
    achievementForm,
    setAchievementForm,
    checkInForm,
    setCheckInForm,
    selectedAchievementGoal,
    selectedAchievementGoalId,
    selectedCheckInGoal,
    selectedCheckInGoalId,
    sheetOwnerName,
    goalSheetWeightage,
    goalSheetDelta,
    canSubmitGoalSheet,
    createGoalRemaining,
    canCreateMoreGoals,
    canCreateGoalCount,
    projectedGoalSheetWeightage,
    newGoalExceedsRemaining,
    employeeGoalCount,
    archivedGoals,
    eligibleSharedUsers,
    getUserId,
    thrustAreaOptions,
    dashboardGoals,
    pendingReviews,
    handleChange,
    handleSubmit,
    handleStatusChange,
    startGoalEdit,
    handleEditGoalChange,
    handleEditGoalSave,
    refreshGoals,
    handleAchievementChange,
    handleCheckInChange,
    handleAchievementSubmit,
    handleCheckInSubmit,
    handleCsvExport,
    handleAchievementCsvExport,
    toggleSharedGoalRecipient,
    handleSharedGoalSubmit,
    handleUnlockGoal,
    handleArchiveGoal,
    handleCycleSave,
    handleHierarchySave,
    handleReviewCheckIn,
    toggleAudit,
    auditMap,
    handleNotificationClick,
    handleLogout,
    viewMeta,
    activeView,
    roleTabs,
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_450px_at_20%_-10%,#dbeafe_0%,rgba(219,234,254,0)_60%),radial-gradient(1200px_500px_at_80%_-20%,#d1fae5_0%,rgba(209,250,229,0)_65%),#f8fafc]">
      <header className="border-b border-slate-200/70 bg-white/85 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[1700px] mx-auto px-5 md:px-8 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{roleMeta.title}</h1>
            <p className="text-sm text-slate-500">{roleMeta.subtitle}</p>
            <div className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${roleMeta.badgeClass}`}>
              Signed in as {user.username} • {user.role}
            </div>
          </div>
          <div className="text-sm text-slate-500">
            <div>debug: role={user.role} isPrivileged={isPrivileged ? 'true' : 'false'}</div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-white font-semibold hover:bg-slate-800"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-[1700px] mx-auto px-5 md:px-8 py-8 space-y-8">
        <section className="rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {roleTabs.map((tab) => {
              const meta = viewMeta[tab.key] || {};
              const isActive = activeView === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => navigate(`/dashboard/${tab.key}`)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">Page</div>
                  <div className="mt-1 text-lg font-black">{tab.label}</div>
                  <p className={`mt-2 text-sm ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                    {meta.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white shadow-sm p-6 md:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Current page</p>
              <h2 className="mt-1 text-3xl font-black text-slate-900">{viewMeta[activeView]?.title || 'Dashboard'}</h2>
              <p className="mt-2 max-w-3xl text-slate-600">{viewMeta[activeView]?.description}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Each page below is separated and routed on its own URL.
            </div>
          </div>
        </section>

        <Outlet context={dashboardContext} />
      </main>
    </div>
  );
}
