import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [reviewingCheckInId, setReviewingCheckInId] = useState('');
  const [actioningGoalId, setActioningGoalId] = useState('');
  const [activeView, setActiveView] = useState(user?.role === 'Employee' ? 'goals' : 'review');
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
  const dashboardGoals = useMemo(() => {
    if (!isEmployee) return goals;
    return goals.filter((goal) => String(goal.employeeId || '') === currentUserId);
  }, [currentUserId, goals, isEmployee]);
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
        { key: 'progress', label: 'Progress' },
      ]
    : [
        { key: 'review', label: 'Reviews' },
        { key: 'checkins', label: 'Check-ins' },
        { key: 'reports', label: 'Reports' },
      ];

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
      setSuccess(status === 'Submitted' ? 'Goal sheet submitted for review' : status === 'Rejected' ? 'Goal returned for rework' : `Goal ${status.toLowerCase()} successfully`);
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

  const handleEditGoalSave = async (goal) => {
    try {
      setError('');
      setSuccess('');
      const payload = goal.isShared && isEmployee
        ? { weightage: Number(editGoalForm.weightage) }
        : {
            ...editGoalForm,
            target: Number(editGoalForm.target || 0),
            deadline: editGoalForm.deadline || null,
            weightage: Number(editGoalForm.weightage),
          };

      await editGoal(goal.id, payload);
      setEditGoalId('');
      setSuccess('Goal updated successfully');
      const goalItems = await loadGoals();
      setGoals(goalItems);
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
        plannedTarget: Number(checkInForm.plannedTarget || 0),
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

    try {
      const recipients = sharedGoalRecipients.map((employeeId) => ({
        employeeId,
        weightage: Number(sharedGoalWeights[employeeId] || 0),
      }));

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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{roleMeta.title}</h1>
            <p className="text-sm text-slate-500">{roleMeta.subtitle}</p>
            <div className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${roleMeta.badgeClass}`}>
              Signed in as {user.username} • {user.role}
            </div>
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

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <section className="rounded-2xl border bg-white p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {roleTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveView(tab.key)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  activeView === tab.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white border shadow-sm p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <item.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="text-2xl font-black text-slate-900">{item.value}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border bg-white shadow-sm p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Notifications
              </h2>
              <p className="text-slate-500 text-sm">Recent in-app events and reminders for your account.</p>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
              {unreadNotificationCount} unread
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {notifications.length === 0 ? (
              <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-500 xl:col-span-3">No notifications yet.</div>
            ) : notifications.slice(0, 6).map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleNotificationClick(notification)}
                className={`text-left rounded-xl border p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/60 ${notification.readAt ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-200'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{notification.title}</div>
                    <div className="mt-1 text-sm text-slate-600">{notification.message}</div>
                    <div className="mt-2 text-xs text-slate-400">
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${notification.readAt ? 'bg-slate-100 text-slate-500' : 'bg-blue-600 text-white'}`}>
                    {notification.readAt ? 'Read' : 'New'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {isPrivileged && activeView === 'review' && (
          <section className={`rounded-3xl border shadow-sm p-6 flex items-center justify-between gap-4 flex-wrap ${isManager ? 'bg-emerald-50/80 border-emerald-200' : 'bg-indigo-50/80 border-indigo-200'}`}>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{isManager ? 'Team Review Queue' : 'Organization Review Queue'}</h2>
              <p className="text-slate-600">{pendingReviews.length} submitted goal{pendingReviews.length === 1 ? '' : 's'} waiting for your decision.</p>
            </div>
            <div className={`rounded-2xl bg-white px-4 py-3 border text-sm font-semibold ${isManager ? 'border-emerald-100 text-emerald-700' : 'border-indigo-100 text-indigo-700'}`}>
              {isManager ? 'Manager workflow enabled' : 'Admin oversight enabled'}
            </div>
          </section>
        )}

        {(isEmployee ? activeView === 'goals' : activeView === 'review') && (
        <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-8">
          <div className="rounded-3xl border bg-white shadow-sm p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {isEmployee ? 'Your Goals' : isManager ? 'Team Goals' : 'Organization Goals'}
              </h2>
              <p className="text-slate-500">
                {isEmployee
                  ? 'MongoDB-backed list of the goals you created.'
                  : isManager
                    ? 'Review submitted goals from your team and take action.'
                    : 'Track all goals across the organization.'}
              </p>
              {isEmployee && (
                <div className={`mt-4 rounded-xl border p-4 ${canSubmitGoalSheet ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className={`text-sm font-semibold ${canSubmitGoalSheet ? 'text-emerald-800' : 'text-amber-900'}`}>
                        {sheetOwnerName}'s goal sheet weightage: {goalSheetWeightage}% / 100%
                      </p>
                      <p className={`text-xs ${canSubmitGoalSheet ? 'text-emerald-700' : 'text-amber-800'}`}>
                        {canSubmitGoalSheet
                          ? 'Ready to submit for manager review.'
                          : goalSheetWeightage < 100
                            ? `Save more goals or edit weightage. Remaining: ${goalSheetDelta}%.`
                            : `Reduce weightage by ${Math.abs(goalSheetDelta)}% before submitting.`}
                      </p>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white sm:w-40">
                      <div className={`h-2 rounded-full ${canSubmitGoalSheet ? 'bg-emerald-600' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, goalSheetWeightage)}%` }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div className="py-20 text-center text-slate-500">Loading goals...</div>
            ) : dashboardGoals.length === 0 ? (
              <div className="py-20 text-center text-slate-500">No goals yet. Create your first one on the right.</div>
            ) : (
              <div className="space-y-4">
                {dashboardGoals.map((goal) => (
                  <article key={goal.id} className="rounded-2xl border border-slate-200 p-5 hover:border-blue-300 transition-colors">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{goal.title}</h3>
                        <p className="text-sm text-slate-500">{goal.thrustArea || 'No thrust area'} • {goal.uom}</p>
                      </div>
                      <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {goal.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{goal.description || 'No description provided.'}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600 md:grid-cols-4">
                      <div><span className="block text-slate-400">Target</span>{goal.target}</div>
                      <div><span className="block text-slate-400">Weightage</span>{goal.weightage}%</div>
                      <div><span className="block text-slate-400">Created</span>{new Date(goal.createdAt).toLocaleDateString()}</div>
                      <div><span className="block text-slate-400">Status</span>{goal.status}</div>
                    </div>

                    {editGoalId === goal.id && (
                      <div className="mt-4 rounded-xl border bg-slate-50 p-4">
                        {goal.isShared && isEmployee ? (
                          <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">Weightage %</label>
                            <input
                              name="weightage"
                              type="number"
                              min="10"
                              max="100"
                              value={editGoalForm.weightage}
                              onChange={handleEditGoalChange}
                              className="w-full rounded-lg border border-slate-300 px-3 py-2"
                            />
                            <p className="mt-2 text-xs text-slate-500">Shared goal title and target are read-only for recipients.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <input name="title" value={editGoalForm.title} onChange={handleEditGoalChange} className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Goal title" />
                            <select name="thrustArea" value={editGoalForm.thrustArea} onChange={handleEditGoalChange} className="rounded-lg border border-slate-300 px-3 py-2 bg-white">
                              <option value="">Select thrust area</option>
                              {!thrustAreaOptions.includes(editGoalForm.thrustArea) && editGoalForm.thrustArea && (
                                <option value={editGoalForm.thrustArea}>{editGoalForm.thrustArea}</option>
                              )}
                              {thrustAreaOptions.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                            <select name="uom" value={editGoalForm.uom} onChange={handleEditGoalChange} className="rounded-lg border border-slate-300 px-3 py-2 bg-white">
                              <option>Numeric</option>
                              <option>Percentage</option>
                              <option>Timeline</option>
                              <option>Zero-based</option>
                            </select>
                            <select name="metricDirection" value={editGoalForm.metricDirection} onChange={handleEditGoalChange} className="rounded-lg border border-slate-300 px-3 py-2 bg-white">
                              <option value="Min">Min</option>
                              <option value="Max">Max</option>
                            </select>
                            <input name="target" type="number" value={editGoalForm.target} onChange={handleEditGoalChange} className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Target" />
                            <input name="deadline" type="date" value={editGoalForm.deadline} onChange={handleEditGoalChange} className="rounded-lg border border-slate-300 px-3 py-2" />
                            <input name="weightage" type="number" min="10" max="100" value={editGoalForm.weightage} onChange={handleEditGoalChange} className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Weightage %" />
                            <textarea name="description" value={editGoalForm.description} onChange={handleEditGoalChange} className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2" placeholder="Description" />
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={() => handleEditGoalSave(goal)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                            Save changes
                          </button>
                          <button type="button" onClick={() => setEditGoalId('')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {isEmployee && goal.status !== 'Submitted' && goal.status !== 'Approved' && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          onClick={() => startGoalEdit(goal)}
                        >
                          Edit goal
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                          onClick={() => handleStatusChange(goal.id, 'Submitted')}
                          disabled={actioningGoalId === goal.id || !canSubmitGoalSheet}
                        >
                          {actioningGoalId === goal.id
                            ? 'Submitting...'
                            : canSubmitGoalSheet
                              ? 'Submit goal sheet'
                              : goalSheetWeightage < 100
                                ? `${goalSheetDelta}% remaining`
                                : `${Math.abs(goalSheetDelta)}% over`}
                        </button>
                      </div>
                    )}

                    {isPrivileged && goal.status === 'Submitted' && (
                      <div className="mt-4 space-y-3">
                        <textarea
                          value={reviewComments[goal.id] || ''}
                          onChange={(e) => setReviewComments((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                          placeholder="Review comment or rework feedback"
                        />
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            onClick={() => startGoalEdit(goal)}
                          >
                            Edit target / weightage
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            onClick={() => handleStatusChange(goal.id, 'Approved')}
                            disabled={actioningGoalId === goal.id}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {actioningGoalId === goal.id ? 'Working...' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                            onClick={() => handleStatusChange(goal.id, 'Rejected')}
                            disabled={actioningGoalId === goal.id}
                          >
                            <XCircle className="h-4 w-4" />
                            {actioningGoalId === goal.id ? 'Working...' : 'Return for rework'}
                          </button>
                        </div>
                      </div>
                    )}
                    {isAdmin && goal.isLocked && (
                      <div className="mt-3">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                          onClick={() => handleUnlockGoal(goal.id)}
                          disabled={unlockingGoalId === goal.id}
                        >
                          {unlockingGoalId === goal.id ? 'Unlocking...' : 'Unlock Goal'}
                        </button>
                      </div>
                    )}
                    <div className="mt-3">
                      <button
                        type="button"
                        className="text-sm text-slate-500 underline"
                        onClick={() => toggleAudit(goal.id)}
                      >
                        {auditMap[goal.id] ? 'Hide history' : 'View history'}
                      </button>
                      {auditMap[goal.id] && (
                        <div className="mt-3 rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
                          {auditMap[goal.id].length === 0 ? (
                            <div className="text-slate-500">No history found.</div>
                          ) : (
                            <ul className="space-y-2">
                              {auditMap[goal.id].map((log) => (
                                <li key={log._id} className="flex items-center justify-between">
                                  <div>
                                    <div className="font-semibold">{log.action}</div>
                                    <div className="text-xs text-slate-500">By: {log.by || 'system'} • {new Date(log.createdAt).toLocaleString()}</div>
                                    {log.comment && <div className="text-xs text-slate-500">Comment: {log.comment}</div>}
                                  </div>
                                  <div className="text-xs text-slate-400">{log.role}</div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {isEmployee ? (
            <div className="rounded-3xl border bg-white shadow-sm p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Create Goal</h2>
                  <p className="text-slate-500">For {sheetOwnerName}'s goal sheet.</p>
                </div>
              </div>
              <div className={`mb-4 rounded-xl border p-3 text-sm ${canCreateMoreGoals && canCreateGoalCount ? 'border-blue-100 bg-blue-50 text-blue-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                <div className="font-semibold">Available weightage in this employee sheet: {createGoalRemaining}%</div>
                <div className="mt-1">
                  {!canCreateGoalCount
                    ? 'BRD cap reached: maximum 8 goals are allowed per employee.'
                    : canCreateMoreGoals
                    ? `${sheetOwnerName}'s current total is ${goalSheetWeightage}%. A new ${form.weightage || 0}% goal would make it ${projectedGoalSheetWeightage}%.`
                    : goalSheetDelta <= 0
                      ? 'This employee sheet is already at 100%. Edit an existing draft/rework goal to free space before adding another.'
                      : `Only ${goalSheetDelta}% is left, but each goal needs at least 10%. Edit an existing goal first.`}
                </div>
                <div className="mt-1 text-xs">Goals used: {employeeGoalCount} / 8 • Per-goal minimum: 10% • Rule is per employee</div>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Goal Title</label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    placeholder="e.g. Improve quarterly sales conversion"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 min-h-28"
                    placeholder="Short description of the goal"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Thrust Area</label>
                  <select
                    name="thrustArea"
                    value={form.thrustArea}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="">Select thrust area</option>
                    {thrustAreaOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">UoM</label>
                    <select
                      name="uom"
                      value={form.uom}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 bg-white"
                    >
                      <option>Numeric</option>
                      <option>Percentage</option>
                      <option>Timeline</option>
                      <option>Zero-based</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Metric Direction</label>
                    <select
                      name="metricDirection"
                      value={form.metricDirection}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="Min">Min</option>
                      <option value="Max">Max</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Target</label>
                    <input
                      name="target"
                      type="number"
                      value={form.target}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      placeholder="e.g. 100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-slate-700">Deadline</label>
                    <input
                      name="deadline"
                      type="date"
                      value={form.deadline}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Weightage %</label>
                  <input
                    name="weightage"
                    type="number"
                    min="10"
                    max={canCreateMoreGoals ? createGoalRemaining : 100}
                    value={form.weightage}
                    onChange={handleChange}
                    className={`w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-500 ${newGoalExceedsRemaining ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}
                    placeholder={canCreateMoreGoals ? `Min 10, max ${createGoalRemaining}` : 'No remaining weightage'}
                  />
                  {newGoalExceedsRemaining && (
                    <p className="mt-1 text-xs font-semibold text-red-600">Only {createGoalRemaining}% is available for a new goal.</p>
                  )}
                </div>

                {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
                {success && <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

                <button
                  type="submit"
                  disabled={saving || !canCreateGoalCount || !canCreateMoreGoals || newGoalExceedsRemaining}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving
                    ? 'Saving...'
                    : !canCreateGoalCount
                      ? '8 goal limit reached'
                      : !canCreateMoreGoals
                      ? 'Edit existing weightage first'
                      : newGoalExceedsRemaining
                        ? `${createGoalRemaining}% available`
                        : 'Save Goal'}
                </button>
              </form>
            </div>
          ) : (
            <div className={`rounded-3xl border shadow-sm p-6 ${isManager ? 'bg-emerald-50/60 border-emerald-200' : 'bg-indigo-50/60 border-indigo-200'}`}>
              <h2 className="text-2xl font-bold text-slate-900">{isManager ? 'Manager Action Panel' : 'Admin Action Panel'}</h2>
              <p className="text-slate-600 mt-1">
                {isManager
                  ? 'Prioritize pending approvals, review check-ins, and coach your team.'
                  : 'Monitor organization performance, resolve pending decisions, and export reports.'}
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3">
                <div className="rounded-xl border bg-white p-4">
                  <p className="text-xs text-slate-500">Pending reviews</p>
                  <p className="text-2xl font-black text-slate-900">{pendingReviews.length}</p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <p className="text-xs text-slate-500">Average completion</p>
                  <p className="text-2xl font-black text-slate-900">{completionAverage}%</p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <p className="text-xs text-slate-500">Quick action</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleCsvExport}
                      disabled={Boolean(exportingCsv)}
                      className="min-h-10 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {exportingCsv === 'goals' ? 'Exporting...' : 'Goals CSV'}
                    </button>
                    <button
                      type="button"
                      onClick={handleAchievementCsvExport}
                      disabled={Boolean(exportingCsv)}
                      className="min-h-10 rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600 disabled:opacity-60"
                    >
                      {exportingCsv === 'achievements' ? 'Exporting...' : 'Achievement CSV'}
                    </button>
                  </div>
                </div>
              </div>

              <form className="mt-6 rounded-xl border bg-white p-4 space-y-3" onSubmit={handleSharedGoalSubmit}>
                <h3 className="font-semibold text-slate-900">Assign Shared Goal</h3>
                <input
                  value={sharedGoalForm.title}
                  onChange={(e) => setSharedGoalForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Goal title"
                  className="w-full rounded-lg border px-3 py-2"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    value={sharedGoalForm.thrustArea}
                    onChange={(e) => setSharedGoalForm((prev) => ({ ...prev, thrustArea: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 bg-white"
                  >
                    <option value="">Select thrust area</option>
                    {thrustAreaOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <input
                    value={sharedGoalForm.target}
                    onChange={(e) => setSharedGoalForm((prev) => ({ ...prev, target: e.target.value }))}
                    placeholder="Target"
                    type="number"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                  <select
                    value={sharedGoalForm.uom}
                    onChange={(e) => setSharedGoalForm((prev) => ({ ...prev, uom: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 bg-white"
                  >
                    <option>Numeric</option>
                    <option>Percentage</option>
                    <option>Timeline</option>
                    <option>Zero-based</option>
                  </select>
                  <select
                    value={sharedGoalForm.metricDirection}
                    onChange={(e) => setSharedGoalForm((prev) => ({ ...prev, metricDirection: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 bg-white"
                  >
                    <option value="Min">Min</option>
                    <option value="Max">Max</option>
                  </select>
                  <input
                    value={sharedGoalForm.deadline}
                    onChange={(e) => setSharedGoalForm((prev) => ({ ...prev, deadline: e.target.value }))}
                    type="date"
                    className="w-full rounded-lg border px-3 py-2"
                  />
                  <select
                    value={sharedGoalForm.primaryOwnerId}
                    onChange={(e) => setSharedGoalForm((prev) => ({ ...prev, primaryOwnerId: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 bg-white"
                  >
                    <option value="">Primary owner</option>
                    {eligibleSharedUsers
                      .filter((item) => sharedGoalRecipients.includes(item._id))
                      .map((item) => (
                        <option key={item._id} value={item._id}>{item.fullName || item.username}</option>
                      ))}
                  </select>
                </div>
                <textarea
                  value={sharedGoalForm.description}
                  onChange={(e) => setSharedGoalForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Description"
                  className="w-full rounded-lg border px-3 py-2 min-h-20"
                />
                <div className="rounded-lg border p-3">
                  <div className="mb-2 text-xs font-semibold text-slate-500">Recipients and individual weightage</div>
                  <div className="space-y-2 max-h-44 overflow-auto">
                    {eligibleSharedUsers.length === 0 ? (
                      <div className="text-sm text-slate-500">No eligible employees found in this scope.</div>
                    ) : eligibleSharedUsers.map((item) => (
                      <label key={item._id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                        <input
                          type="checkbox"
                          checked={sharedGoalRecipients.includes(item._id)}
                          onChange={() => toggleSharedGoalRecipient(item._id)}
                        />
                        <span className="min-w-0 flex-1 text-sm font-medium text-slate-700">{item.fullName || item.username}</span>
                        <input
                          type="number"
                          min="10"
                          max="100"
                          disabled={!sharedGoalRecipients.includes(item._id)}
                          value={sharedGoalWeights[item._id] || ''}
                          onChange={(e) => setSharedGoalWeights((prev) => ({ ...prev, [item._id]: e.target.value }))}
                          className="w-24 rounded-md border px-2 py-1 text-sm disabled:bg-slate-100"
                          placeholder="%"
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                  Create Shared Goals
                </button>
              </form>
            </div>
          )}
        </section>
        )}

        {(isEmployee ? activeView === 'progress' : activeView === 'checkins') && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="rounded-3xl border bg-white shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Achievement Tracking</h2>
            <p className="text-slate-500 mb-5">Log actual progress by quarter for any goal.</p>

            <form className="space-y-3" onSubmit={handleAchievementSubmit}>
              <select
                name="goalId"
                value={selectedAchievementGoalId}
                onChange={handleAchievementChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-white"
              >
                <option value="">Select goal</option>
                {dashboardGoals.map((goal) => (
                  <option key={goal.id} value={goal.id}>{goal.title}</option>
                ))}
              </select>
              {selectedAchievementGoal && (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Planned target: <span className="font-semibold text-slate-900">{selectedAchievementGoal.target}</span> • {selectedAchievementGoal.uom} • {selectedAchievementGoal.metricDirection}
                  {selectedAchievementGoal.deadline && ` • Deadline ${new Date(selectedAchievementGoal.deadline).toLocaleDateString()}`}
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <select name="quarter" value={achievementForm.quarter} onChange={handleAchievementChange} className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-white">
                  <option>Q1</option>
                  <option>Q2</option>
                  <option>Q3</option>
                  <option>Q4</option>
                </select>
                <input
                  name="actual"
                  type="number"
                  value={achievementForm.actual}
                  onChange={handleAchievementChange}
                  placeholder="Actual"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
                <input
                  name="completionDate"
                  type="date"
                  value={achievementForm.completionDate}
                  onChange={handleAchievementChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>
              <select name="status" value={achievementForm.status} onChange={handleAchievementChange} className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-white">
                <option>Not Started</option>
                <option>On Track</option>
                <option>Completed</option>
              </select>
              <button type="submit" disabled={savingAchievement} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {savingAchievement ? 'Saving...' : 'Log Achievement'}
              </button>
            </form>

            <div className="mt-6 space-y-2 max-h-64 overflow-auto">
              {achievements.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-xl border p-3 text-sm">
                  <div className="font-semibold">{item.goalTitle || 'Goal'} • {item.quarter} • {item.status} • Score {item.progressScore ?? 0}%</div>
                  {item.employeeName && <div className="text-slate-500">Employee: {item.employeeName}</div>}
                  <div className="text-slate-500">Planned {item.plannedTarget ?? '-'} / Actual {item.actual}</div>
                  {item.completionDate && <div className="text-slate-500">Completion: {new Date(item.completionDate).toLocaleDateString()}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border bg-white shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Quarterly Check-ins</h2>
            <p className="text-slate-500 mb-5">Capture planned vs actual and manager comments.</p>

            <form className="space-y-3" onSubmit={handleCheckInSubmit}>
              <select
                name="goalId"
                value={selectedCheckInGoalId}
                onChange={handleCheckInChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-white"
              >
                <option value="">Select goal</option>
                {dashboardGoals.map((goal) => (
                  <option key={goal.id} value={goal.id}>{goal.title}</option>
                ))}
              </select>
              {selectedCheckInGoal && (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Goal target: <span className="font-semibold text-slate-900">{selectedCheckInGoal.target}</span> • {selectedCheckInGoal.uom} • {selectedCheckInGoal.metricDirection}
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <select name="quarter" value={checkInForm.quarter} onChange={handleCheckInChange} className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-white">
                  <option>Q1</option>
                  <option>Q2</option>
                  <option>Q3</option>
                  <option>Q4</option>
                </select>
                <input name="plannedTarget" type="number" value={checkInForm.plannedTarget} onChange={handleCheckInChange} placeholder="Planned" className="w-full rounded-xl border border-slate-300 px-4 py-3" />
                <input name="actualAchievement" type="number" value={checkInForm.actualAchievement} onChange={handleCheckInChange} placeholder="Actual" className="w-full rounded-xl border border-slate-300 px-4 py-3" />
              </div>
              <input name="completionDate" type="date" value={checkInForm.completionDate} onChange={handleCheckInChange} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
              <textarea name="comment" value={checkInForm.comment} onChange={handleCheckInChange} placeholder="Comment" className="w-full rounded-xl border border-slate-300 px-4 py-3 min-h-20" />
              <button type="submit" disabled={savingCheckIn} className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {savingCheckIn ? 'Saving...' : 'Save Check-in'}
              </button>
            </form>

            <div className="mt-6 space-y-2 max-h-64 overflow-auto">
              {checkIns.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-xl border p-3 text-sm">
                  <div className="font-semibold">{item.goalTitle || 'Goal'} • {item.quarter} • Score {item.progressScore}%</div>
                  {item.employeeName && <div className="text-slate-500">Employee: {item.employeeName}</div>}
                  <div className="text-slate-500">Planned {item.plannedTarget} / Actual {item.actualAchievement}</div>
                  {item.comment && <div className="text-slate-500">Comment: {item.comment}</div>}
                  {item.managerComment && <div className="text-slate-500">Manager: {item.managerComment}</div>}
                  {isPrivileged && (
                    <button
                      type="button"
                      className="mt-2 rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                      onClick={() => handleReviewCheckIn(item.id)}
                      disabled={reviewingCheckInId === item.id}
                    >
                      {reviewingCheckInId === item.id ? 'Reviewing...' : 'Review'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

        {isPrivileged && report && activeView === 'reports' && (
          <section className="rounded-3xl border bg-white shadow-sm p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-slate-900">Reporting & Export</h2>
                <p className="text-slate-500">Organization-level summary and CSV export.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:shrink-0">
                <button
                  type="button"
                  onClick={handleCsvExport}
                  disabled={Boolean(exportingCsv)}
                  className="min-h-11 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {exportingCsv === 'goals' ? 'Exporting...' : 'Export Goals CSV'}
                </button>
                <button
                  type="button"
                  onClick={handleAchievementCsvExport}
                  disabled={Boolean(exportingCsv)}
                  className="min-h-11 rounded-xl bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-600 disabled:opacity-60"
                >
                  {exportingCsv === 'achievements' ? 'Exporting...' : 'Export Achievement CSV'}
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-xl border p-3"><p className="text-xs text-slate-500">Users</p><p className="text-xl font-bold">{report.totalUsers}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-slate-500">Goals</p><p className="text-xl font-bold">{report.totalGoals}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-slate-500">Achievements</p><p className="text-xl font-bold">{report.totalAchievements}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-slate-500">Check-ins</p><p className="text-xl font-bold">{report.totalCheckIns}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-slate-500">Weightage</p><p className="text-xl font-bold">{report.totalWeightage}</p></div>
            </div>

            {analyticsReport && (
              <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-xl border p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">QoQ Achievement Trends</h3>
                  <div className="space-y-2">
                    {analyticsReport.trendRows.map((row) => (
                      <div key={row.quarter} className="grid grid-cols-[44px_1fr_64px] items-center gap-3 text-sm">
                        <span className="font-semibold text-slate-700">{row.quarter}</span>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(100, row.averageProgress)}%` }} />
                        </div>
                        <span className="text-right text-slate-600">{row.averageProgress}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Goal Distribution</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {[
                      ['Status', analyticsReport.distribution.byStatus],
                      ['Thrust Area', analyticsReport.distribution.byThrustArea],
                      ['UoM', analyticsReport.distribution.byUom],
                    ].map(([label, values]) => (
                      <div key={label} className="rounded-lg bg-slate-50 p-3">
                        <div className="font-semibold text-slate-700">{label}</div>
                        {Object.entries(values).map(([key, value]) => (
                          <div key={key} className="mt-1 flex justify-between gap-2 text-slate-500">
                            <span>{key}</span>
                            <span>{value}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Manager Effectiveness</h3>
                  <div className="space-y-2">
                    {analyticsReport.managerRows.length === 0 ? (
                      <div className="text-sm text-slate-500">No manager data yet.</div>
                    ) : analyticsReport.managerRows.map((row) => (
                      <div key={row.managerId} className="rounded-lg bg-slate-50 p-3 text-sm">
                        <div className="font-semibold text-slate-800">{row.managerName}</div>
                        <div className="text-slate-500">Team {row.teamSize} • Reviews {row.reviewedCount} • Check-ins {row.teamCheckInCompletionRate}%</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Escalation Log</h3>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {analyticsReport.escalations.length === 0 ? (
                      <div className="text-sm text-slate-500">No active escalation items.</div>
                    ) : analyticsReport.escalations.map((item, index) => (
                      <div key={`${item.type}-${index}`} className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-sm">
                        <div className="font-semibold text-amber-900">{item.type} • {item.severity}</div>
                        <div className="text-amber-800">{item.ownerName}</div>
                        <div className="text-amber-700">{item.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isAdmin && cycleSettings && (
              <div className="mt-6 rounded-xl border p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Cycle Settings (month indexes 0-11)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {['phase1Months', 'q1Months', 'q2Months', 'q3Months', 'q4Months'].map((key) => (
                    <input
                      key={key}
                      value={(cycleSettings[key] || []).join(',')}
                      onChange={(e) => setCycleSettings((prev) => ({
                        ...prev,
                        [key]: e.target.value.split(',').map((item) => Number(item.trim())).filter((item) => !Number.isNaN(item)),
                      }))}
                      className="w-full rounded-lg border px-3 py-2"
                      placeholder={key}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleCycleSave}
                  disabled={savingCycle}
                  className="mt-3 min-h-10 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
                >
                  {savingCycle ? 'Saving...' : 'Save Cycle Settings'}
                </button>
              </div>
            )}

            {isAdmin && (
              <div className="mt-6 rounded-xl border p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">User Hierarchy</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={hierarchyForm.userId}
                    onChange={(e) => setHierarchyForm((prev) => ({ ...prev, userId: e.target.value }))}
                    className="rounded-lg border px-3 py-2"
                  >
                    <option value="">Select user</option>
                    {users.map((item) => (
                      <option key={item._id} value={item._id}>{item.fullName || item.username}</option>
                    ))}
                  </select>
                  <input
                    value={hierarchyForm.department}
                    onChange={(e) => setHierarchyForm((prev) => ({ ...prev, department: e.target.value }))}
                    className="rounded-lg border px-3 py-2"
                    placeholder="Department"
                  />
                  <select
                    value={hierarchyForm.managerId}
                    onChange={(e) => setHierarchyForm((prev) => ({ ...prev, managerId: e.target.value }))}
                    className="rounded-lg border px-3 py-2"
                  >
                    <option value="">No manager</option>
                    {users.filter((item) => item.role === 'Manager' || item.role === 'Admin').map((item) => (
                      <option key={item._id} value={item._id}>{item.fullName || item.username}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleHierarchySave}
                  disabled={savingHierarchy}
                  className="mt-3 min-h-10 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
                >
                  {savingHierarchy ? 'Saving...' : 'Save Hierarchy'}
                </button>
              </div>
            )}

            <div className="mt-6 overflow-auto">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Completion Rate by User</h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2">User</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Department</th>
                    <th className="py-2">Goals</th>
                    <th className="py-2">Approved</th>
                    <th className="py-2">Completion</th>
                    <th className="py-2">Quarters Done</th>
                    <th className="py-2">Check-in Completion</th>
                    <th className="py-2">Reviewed</th>
                  </tr>
                </thead>
                <tbody>
                  {completionRows.map((row) => (
                    <tr key={row.userId} className="border-b last:border-0">
                      <td className="py-2">{row.fullName || row.username}</td>
                      <td className="py-2">{row.role}</td>
                      <td className="py-2">{row.department || 'Unassigned'}</td>
                      <td className="py-2">{row.totalGoals}</td>
                      <td className="py-2">{row.approvedGoals}</td>
                      <td className="py-2">{row.completionRate}%</td>
                      <td className="py-2">{row.completedQuarters?.join(', ') || '-'}</td>
                      <td className="py-2">{row.checkinCompletionRate}%</td>
                      <td className="py-2">{row.reviewedCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
