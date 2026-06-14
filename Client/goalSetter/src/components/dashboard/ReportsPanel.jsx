export default function ReportsPanel({
  report,
  analyticsReport,
  completionRows,
  handleCsvExport,
  handleAchievementCsvExport,
  exportingCsv,
  isAdmin,
  cycleSettings,
  setCycleSettings,
  handleCycleSave,
  savingCycle,
  users,
  getUserId,
  hierarchyForm,
  setHierarchyForm,
  handleHierarchySave,
  savingHierarchy,
}) {
  if (!report) {
    return null;
  }

  return (
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
                <option key={getUserId(item)} value={getUserId(item)}>{item.fullName || item.username}</option>
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
                <option key={getUserId(item)} value={getUserId(item)}>{item.fullName || item.username}</option>
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
  );
}
