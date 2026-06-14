import { useOutletContext } from 'react-router-dom';
import AchievementsPanel from '../../components/dashboard/AchievementsPanel';

export default function AchievementsPage() {
  const dashboard = useOutletContext();

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border bg-white shadow-sm p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Achievements</p>
        <h2 className="mt-1 text-3xl font-black text-slate-900">Track goal progress</h2>
        <p className="mt-2 max-w-3xl text-slate-600">
          This page is only for achievement entry and the latest progress snapshots.
        </p>
      </div>
      <AchievementsPanel {...dashboard} />
    </section>
  );
}
