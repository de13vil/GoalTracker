export default function AchievementsPanel({
  dashboardGoals,
  selectedAchievementGoal,
  selectedAchievementGoalId,
  achievementForm,
  handleAchievementChange,
  handleAchievementSubmit,
  savingAchievement,
  achievements,
}) {
  return (
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
      </div>

      <div className="rounded-3xl border bg-white shadow-sm p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-1">Recent Achievements</h2>
        <p className="text-slate-500 mb-5">The latest achievement entries for the selected goals.</p>
        <div className="space-y-2 max-h-[36rem] overflow-auto">
          {achievements.slice(0, 8).map((item) => (
            <div key={item.id} className="rounded-xl border p-3 text-sm">
              <div className="font-semibold">{item.goalTitle || 'Goal'} • {item.quarter} • {item.status} • Score {item.progressScore ?? 0}%</div>
              {item.employeeName && <div className="text-slate-500">Employee: {item.employeeName}</div>}
              <div className="text-slate-500">Planned {item.plannedTarget ?? '-'} / Actual {item.actual}</div>
              {item.completionDate && <div className="text-slate-500">Completion: {new Date(item.completionDate).toLocaleDateString()}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
