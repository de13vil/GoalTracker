import { useOutletContext } from 'react-router-dom';
import ReviewPanel from '../../components/dashboard/ReviewPanel';

export default function ReviewPage() {
  const dashboard = useOutletContext();
  const reviewScope = dashboard.isAdmin
    ? 'This page is only for approvals, rejections, admin unlocks, and review history.'
    : 'This page is only for approvals, rejections, and review history. Admin unlock is required for approved-goal corrections.';

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border bg-white shadow-sm p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Reviews</p>
        <h2 className="mt-1 text-3xl font-black text-slate-900">Review queue</h2>
        <p className="mt-2 max-w-3xl text-slate-600">
          {reviewScope}
        </p>
      </div>
      <ReviewPanel {...dashboard} />
    </section>
  );
}
