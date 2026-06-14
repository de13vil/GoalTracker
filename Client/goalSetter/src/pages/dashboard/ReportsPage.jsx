import { useOutletContext } from 'react-router-dom';
import ReportsPanel from '../../components/dashboard/ReportsPanel';

export default function ReportsPage() {
  const dashboard = useOutletContext();

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border bg-white shadow-sm p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Reports</p>
        <h2 className="mt-1 text-3xl font-black text-slate-900">Reports and admin controls</h2>
        <p className="mt-2 max-w-3xl text-slate-600">
          This page holds exports, analytics, cycle settings, and hierarchy configuration.
        </p>
      </div>
      <ReportsPanel {...dashboard} />
    </section>
  );
}
