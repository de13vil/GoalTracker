import React, { useState } from 'react';
import { CheckCircle2, ClipboardList, Plus, TrendingUp, XCircle } from 'lucide-react';
import { createObjection, editGoal } from '../../api/goals';

export default function GoalsPanel({
  isEmployee,
  isManager,
  currentUserId,
  isPrivileged,
  dashboardGoals,
  eligibleSharedUsers,
  sharedGoalForm,
  setSharedGoalForm,
  sharedGoalRecipients,
  setSharedGoalRecipients,
  sharedGoalWeights,
  setSharedGoalWeights,
  toggleSharedGoalRecipient,
  handleSharedGoalSubmit,
  savingSharedGoals,
  loading,
  canSubmitGoalSheet,
  sheetOwnerName,
  goalSheetWeightage,
  goalSheetDelta,
  canCreateMoreGoals,
  canCreateGoalCount,
  createGoalRemaining,
  employeeGoalCount,
  archivedGoals,
  projectedGoalSheetWeightage,
  newGoalExceedsRemaining,
  saving,
  form,
  handleSubmit,
  handleChange,
  editGoalId,
  editGoalForm,
  handleEditGoalChange,
  handleEditGoalSave,
  refreshGoals,
  startGoalEdit,
  setEditGoalId,
  actioningGoalId,
  reviewComments,
  setReviewComments,
  handleStatusChange,
  handleArchiveGoal,
  unlockingGoalId,
  handleUnlockGoal,
  toggleAudit,
  auditMap,
  thrustAreaOptions,
  error,
  success,
  users,
}) {
  const [objectionOpen, setObjectionOpen] = useState(false);
  const [objectionType, setObjectionType] = useState('change');
  const [objectionComment, setObjectionComment] = useState('');
  const [objectioningGoalId, setObjectioningGoalId] = useState('');
  const [localMsg, setLocalMsg] = useState('');
  const [localErr, setLocalErr] = useState('');
  const [groupEditorOpen, setGroupEditorOpen] = useState(false);
  const [groupAllocations, setGroupAllocations] = useState({});
  const [groupSaving, setGroupSaving] = useState(false);
  const employeeTotals = dashboardGoals.reduce((acc, goal) => {
    const id = String(goal.employeeId || '');
    acc[id] = (acc[id] || 0) + Number(goal.weightage || 0);
    return acc;
  }, {});
  const remainingByEmployee = (employeeId) => Math.max(0, 100 - Number(employeeTotals[String(employeeId)] || 0));
  const selectableRecipients = (eligibleSharedUsers || []).filter((user) => remainingByEmployee(user._id || user.id) >= 10);
  return (
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
          {isEmployee && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Finished a goal? Archive it to remove it from the active sheet and free weightage for a new goal.
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
                {goal.isShared && (
                  <div className="mt-3 rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="font-semibold">Shared allocations</div>
                    <div className="mt-1 text-xs text-slate-500">Recipients may adjust only their weightage. Title/Target are read-only. Edit allowed while Draft or Rejected.</div>
                    <div className="mt-2 space-y-2">
                      {dashboardGoals.filter((g) => g.sharedGroupId && g.sharedGroupId === goal.sharedGroupId).map((memberGoal) => {
                        const isMe = String(memberGoal.employeeId) === String(currentUserId);
                        const member = (users || []).find((u) => String(u._id || u.id) === String(memberGoal.employeeId));
                        const memberName = member ? (member.fullName || member.username || member.email) : String(memberGoal.employeeId);
                        return (
                          <div key={memberGoal.id} className="flex items-center justify-between gap-3">
                            <div className="text-sm text-slate-600">
                              {memberName}{' '}
                              <span className="text-xs text-slate-400">(weightage)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isMe && ['Draft', 'Rejected'].includes(memberGoal.status) ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="10"
                                    max="100"
                                    defaultValue={memberGoal.weightage}
                                    onChange={(e) => { memberGoal._pending = e.target.value; }}
                                    className="w-20 rounded-lg border border-slate-300 px-2 py-1"
                                  />
                                  <button
                                    type="button"
                                    className="rounded-md bg-slate-900 px-3 py-1 text-xs text-white"
                                    onClick={async () => {
                                      try {
                                        setLocalErr('');
                                        setLocalMsg('');
                                        await handleEditGoalSave(memberGoal, { weightage: Number(memberGoal._pending || memberGoal.weightage) });
                                        setLocalMsg('Saved');
                                      } catch (err) {
                                        setLocalErr(err.message || 'Failed to save');
                                      }
                                    }}
                                  >
                                    Save
                                  </button>
                                </div>
                              ) : (
                                <div className="text-sm text-slate-700">{memberGoal.weightage}%</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {(isPrivileged) && (
                        <div className="mt-3">
                          <button
                            type="button"
                            data-testid="edit-allocations-btn"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              // open group editor modal and seed allocations
                              const members = dashboardGoals.filter((g) => g.sharedGroupId && g.sharedGroupId === goal.sharedGroupId);
                              const initial = {};
                              members.forEach((m) => { initial[m.id] = m.weightage; });
                              setGroupAllocations(initial);
                              setGroupEditorOpen(true);
                            }}
                          >
                            Edit allocations
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {groupEditorOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-2xl rounded-xl bg-white p-6">
                      <h3 className="text-lg font-bold">Edit group allocations</h3>
                      <p className="mt-2 text-sm text-slate-600">Adjust weightage per recipient and save. Server will validate per-employee totals and min 10%.</p>
                      <div className="mt-4 space-y-3">
                        {dashboardGoals.filter((g) => g.sharedGroupId && g.sharedGroupId === goal.sharedGroupId).map((memberGoal) => {
                          const member = (users || []).find((u) => String(u._id || u.id) === String(memberGoal.employeeId));
                          const memberName = member ? (member.fullName || member.username || member.email) : String(memberGoal.employeeId);
                          return (
                            <div key={memberGoal.id} className="flex items-center justify-between gap-3">
                              <div className="text-sm">{memberName}</div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="10"
                                  max="100"
                                  value={groupAllocations[memberGoal.id]}
                                  onChange={(e) => setGroupAllocations((prev) => ({ ...prev, [memberGoal.id]: Number(e.target.value) }))}
                                  className="w-24 rounded-md border px-2 py-1"
                                />
                                <div className="text-sm text-slate-500">%</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <button className="rounded-xl border px-4 py-2" onClick={() => setGroupEditorOpen(false)}>Cancel</button>
                        <button
                          className="rounded-xl bg-slate-900 px-4 py-2 text-white"
                          onClick={async () => {
                            try {
                              setGroupSaving(true);
                              setLocalErr('');
                              setLocalMsg('');
                              const entries = Object.entries(groupAllocations);
                              await Promise.all(entries.map(([goalId, weight]) => editGoal(goalId, { weightage: Number(weight) })));
                              setLocalMsg('Allocations updated');
                              setGroupEditorOpen(false);
                              await refreshGoals?.();
                            } catch (err) {
                              setLocalErr(err.message || 'Failed to update allocations');
                            } finally {
                              setGroupSaving(false);
                            }
                          }}
                          disabled={groupSaving}
                        >
                          {groupSaving ? 'Saving...' : 'Save All'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600 md:grid-cols-4">
                  <div><span className="block text-slate-400">Target</span>{goal.target}</div>
                  <div><span className="block text-slate-400">Weightage</span>{goal.weightage}%</div>
                  <div><span className="block text-slate-400">Created</span>{new Date(goal.createdAt).toLocaleDateString()}</div>
                  <div><span className="block text-slate-400">Status</span>{goal.status}</div>
                </div>

                {editGoalId === goal.id && (
                  <div className="mt-4 rounded-xl border bg-slate-50 p-4">
                    {goal.isShared && String(goal.employeeId) === String(currentUserId) ? (
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
                        <p className="mt-2 text-xs text-slate-500">Shared goal title and target are read-only for recipients; as the recipient you can adjust your share.</p>
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

                {(isEmployee || isPrivileged) && goal.status !== 'Submitted' && goal.status !== 'Approved' && (
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
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                        onClick={() => handleArchiveGoal(goal.id)}
                        disabled={actioningGoalId === goal.id}
                      >
                        Mark complete & archive
                      </button>
                  </div>
                )}

                {goal.isShared && String(goal.employeeId) === String(currentUserId) && !['Draft', 'Rejected'].includes(goal.status) && (
                  <div className="mt-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                      onClick={() => { setObjectioningGoalId(goal.id); setObjectionOpen(true); setLocalMsg(''); setLocalErr(''); }}
                    >
                      File objection
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
                {isEmployee && goal.status === 'Submitted' && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Submitted and waiting for manager review. Employees cannot approve or return their own goal.
                  </div>
                )}
                {goal.isLocked && isManager && (
                  <div className="mt-3 text-sm text-slate-500">This goal is locked for manager review.</div>
                )}
                {goal.isLocked && !isEmployee && !isManager && (
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
        {objectionOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-xl bg-white p-6">
              <h3 className="text-lg font-bold">File objection for shared goal</h3>
              <p className="mt-2 text-sm text-slate-600">Request removal or change of your allocation. Admins will review.</p>
              <div className="mt-4">
                <label className="block text-sm font-semibold">Type</label>
                <select value={objectionType} onChange={(e) => setObjectionType(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2">
                  <option value="change">Request change</option>
                  <option value="remove">Request removal</option>
                </select>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-semibold">Comment (optional)</label>
                <textarea value={objectionComment} onChange={(e) => setObjectionComment(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" />
              </div>
              {localErr && <div className="mt-3 text-sm text-red-600">{localErr}</div>}
              {localMsg && <div className="mt-3 text-sm text-emerald-600">{localMsg}</div>}
              <div className="mt-4 flex justify-end gap-2">
                <button className="rounded-xl border px-4 py-2" onClick={() => setObjectionOpen(false)}>Cancel</button>
                <button
                  className="rounded-xl bg-rose-600 px-4 py-2 text-white"
                  onClick={async () => {
                    try {
                      setLocalErr('');
                      await createObjection(objectioningGoalId, { type: objectionType, comment: objectionComment });
                      setLocalMsg('Objection filed — admins notified');
                      setObjectionComment('');
                    } catch (err) {
                      setLocalErr(err.message || 'Failed to file objection');
                    }
                  }}
                >
                  Submit
                </button>
              </div>
            </div>
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
      ) : null}

      {isPrivileged ? (
        <div className="rounded-3xl border bg-white shadow-sm p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Assign Shared Goal</h2>
              <p className="text-slate-500">Only employees with at least 10% free capacity are shown.</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSharedGoalSubmit}>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Title</label>
              <input
                value={sharedGoalForm.title}
                onChange={(e) => setSharedGoalForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                placeholder="e.g. Reduce average response time"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Description</label>
              <textarea
                value={sharedGoalForm.description}
                onChange={(e) => setSharedGoalForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500 min-h-24"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Target</label>
                <input
                  type="number"
                  value={sharedGoalForm.target}
                  onChange={(e) => setSharedGoalForm((prev) => ({ ...prev, target: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Deadline</label>
                <input
                  type="date"
                  value={sharedGoalForm.deadline}
                  onChange={(e) => setSharedGoalForm((prev) => ({ ...prev, deadline: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-800">Recipients</div>
              <div className="mt-2 text-xs text-slate-500">Employees are shown only if they still have at least 10% space left on their sheet.</div>
              <div className="mt-3 space-y-2 max-h-64 overflow-auto">
                {selectableRecipients.length === 0 ? (
                  <div className="text-sm text-slate-500">No employees have enough capacity for a shared goal right now.</div>
                ) : selectableRecipients.map((user) => {
                  const userId = String(user._id || user.id);
                  const remaining = remainingByEmployee(userId);
                  const selected = sharedGoalRecipients.includes(userId);
                  return (
                    <label key={userId} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${selected ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                      <span className="text-sm text-slate-700">{user.fullName || user.username || user.email} <span className="text-xs text-slate-400">remaining {remaining}%</span></span>
                      <input type="checkbox" checked={selected} onChange={() => toggleSharedGoalRecipient(userId)} className="h-4 w-4" />
                    </label>
                  );
                })}
              </div>
            </div>

            {sharedGoalRecipients.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-800">Per-recipient weightage</div>
                {sharedGoalRecipients.map((recipientId) => {
                  const recipient = (eligibleSharedUsers || users || []).find((u) => String(u._id || u.id) === String(recipientId));
                  const remaining = remainingByEmployee(recipientId);
                  return (
                    <div key={recipientId} className="flex items-center justify-between gap-3">
                      <div className="text-sm text-slate-700">{recipient ? (recipient.fullName || recipient.username || recipient.email) : recipientId}</div>
                      <input
                        type="number"
                        min="10"
                        max={remaining}
                        value={sharedGoalWeights[recipientId] || ''}
                        onChange={(e) => setSharedGoalWeights((prev) => ({ ...prev, [recipientId]: e.target.value }))}
                        className="w-24 rounded-lg border border-slate-300 px-3 py-2"
                        placeholder={`max ${remaining}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            {success && <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

            <button
              type="submit"
              disabled={savingSharedGoals || sharedGoalRecipients.length === 0}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {savingSharedGoals ? 'Assigning...' : 'Assign Shared Goal'}
            </button>
          </form>
        </div>
      ) : null}

      {isEmployee && archivedGoals?.length > 0 && (
        <div className="rounded-3xl border bg-white shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-900">Archived Goals</h2>
          <p className="mt-1 text-sm text-slate-500">These no longer count toward your active weightage.</p>
          <div className="mt-4 space-y-3">
            {archivedGoals.map((goal) => (
              <div key={goal.id} className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{goal.title}</div>
                    <div className="text-xs text-slate-500">Archived {goal.archivedAt ? new Date(goal.archivedAt).toLocaleDateString() : 'recently'} • Weightage {goal.weightage}%</div>
                  </div>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Archived</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
