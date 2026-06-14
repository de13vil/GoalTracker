export default function CheckInsPanel({
  dashboardGoals,
  selectedCheckInGoal,
  selectedCheckInGoalId,
  checkInForm,
  handleCheckInChange,
  handleCheckInSubmit,
  savingCheckIn,
  checkIns,
  isPrivileged,
  reviewingCheckInId,
  handleReviewCheckIn,
  isManager,
}) {
  const showCheckInForm = isManager;

  return (
    <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <div className="rounded-3xl border bg-white shadow-sm p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-1">Quarterly Check-ins</h2>
        <p className="text-slate-500 mb-5">Capture planned vs actual and manager comments.</p>

        {showCheckInForm ? (
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
            <div className="grid grid-cols-2 gap-3">
              <select name="quarter" value={checkInForm.quarter} onChange={handleCheckInChange} className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-white">
                <option>Q1</option>
                <option>Q2</option>
                <option>Q3</option>
                <option>Q4</option>
              </select>
              <input name="actualAchievement" type="number" value={checkInForm.actualAchievement} onChange={handleCheckInChange} placeholder="Actual" className="w-full rounded-xl border border-slate-300 px-4 py-3" />
            </div>
            <input name="completionDate" type="date" value={checkInForm.completionDate} onChange={handleCheckInChange} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
            <textarea name="comment" value={checkInForm.comment} onChange={handleCheckInChange} placeholder="Comment" className="w-full rounded-xl border border-slate-300 px-4 py-3 min-h-20" />
            <button type="submit" disabled={savingCheckIn} className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {savingCheckIn ? 'Saving...' : 'Save Check-in'}
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600">
            Quarterly check-ins are manager-review only.
          </div>
        )}
      </div>

      <div className="rounded-3xl border bg-white shadow-sm p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-1">Recent Check-ins</h2>
        <p className="text-slate-500 mb-5">The latest planned vs actual updates.</p>
        <div className="space-y-2 max-h-144 overflow-auto">
          {checkIns.slice(0, 8).map((item) => (
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
  );
}
