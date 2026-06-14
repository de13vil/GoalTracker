import { useOutletContext } from 'react-router-dom';
import CheckInsPanel from '../../components/dashboard/CheckInsPanel';

export default function CheckInsPage() {
  const dashboard = useOutletContext();

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border bg-white shadow-sm p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Check-ins</p>
        <h2 className="mt-1 text-3xl font-black text-slate-900">Quarterly check-in page</h2>
        <p className="mt-2 max-w-3xl text-slate-600">
          This page is only for planned vs actual updates and manager review of check-ins.
        </p>
      </div>
      <CheckInsPanel {...dashboard} />
    </section>
  );
}
