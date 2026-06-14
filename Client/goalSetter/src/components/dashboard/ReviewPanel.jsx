import { CheckCircle2, XCircle } from 'lucide-react';

export default function ReviewPanel({
  isManager,
  isAdmin,
  pendingReviews,
  reviewComments,
  setReviewComments,
  startGoalEdit,
  handleStatusChange,
  actioningGoalId,
  dashboardGoals,
  unlockingGoalId,
  handleUnlockGoal,
  toggleAudit,
  auditMap,
  loading,
}) {
  return (
    <section className="grid grid-cols-1 gap-8">
      <div className={`rounded-3xl border shadow-sm p-6 flex items-center justify-between gap-4 flex-wrap ${isManager ? 'bg-emerald-50/80 border-emerald-200' : 'bg-indigo-50/80 border-indigo-200'}`}>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{isManager ? 'Team Review Queue' : 'Organization Review Queue'}</h2>
          <p className="text-slate-600">{pendingReviews.length} submitted goal{pendingReviews.length === 1 ? '' : 's'} waiting for your decision.</p>
        </div>
        <div className={`rounded-2xl bg-white px-4 py-3 border text-sm font-semibold ${isManager ? 'border-emerald-100 text-emerald-700' : 'border-indigo-100 text-indigo-700'}`}>
          {isManager ? 'Manager workflow enabled' : 'Admin oversight enabled'}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900">What happens next</h3>
        <p className="mt-2 text-sm text-slate-600">
          Admin/Manager assigns or reviews goals, employees adjust weightage, then they submit only when the active sheet reaches 100%.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm text-slate-600">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="font-semibold text-slate-900">1. Shared goal assigned</div>
            <div className="mt-1">Recipients edit their allowed fields and set their share of weightage.</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="font-semibold text-slate-900">2. Employee submits</div>
            <div className="mt-1">The sheet must total exactly 100% before submit is enabled.</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="font-semibold text-slate-900">3. Manager/Admin decides</div>
            <div className="mt-1">Approve or return for rework. Only Admin can unlock approved goals for exceptions.</div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border bg-white shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Review Goals</h2>
          <p className="text-slate-500">Approve, reject, unlock, and inspect audit history from a dedicated page.</p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500">Loading goals...</div>
        ) : dashboardGoals.length === 0 ? (
          <div className="py-20 text-center text-slate-500">No goals yet.</div>
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

                {goal.status === 'Submitted' && (
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
                {goal.isLocked && isAdmin && (
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
                {goal.isLocked && isManager && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    This goal is locked after approval. Admin unlock is required before any correction.
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
    </section>
  );
}
