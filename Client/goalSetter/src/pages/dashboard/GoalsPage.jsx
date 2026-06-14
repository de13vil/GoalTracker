import { useOutletContext } from 'react-router-dom';
import GoalsPanel from '../../components/dashboard/GoalsPanel';

export default function GoalsPage() {
  const dashboard = useOutletContext();

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border bg-white shadow-sm p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Goals</p>
        <h2 className="mt-1 text-3xl font-black text-slate-900">Create and manage goals</h2>
        <p className="mt-2 max-w-3xl text-slate-600">
          This page is only for goal creation, editing, submission, and review of goal history.
        </p>
      </div>
      <GoalsPanel {...dashboard} />
    </section>
  );
}
