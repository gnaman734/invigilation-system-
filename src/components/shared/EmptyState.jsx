import { ArrowRight } from 'lucide-react';

export default function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction }) {
  return (
    <div className="app-empty-state flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      {Icon ? (
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/35">
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <h3 className="text-base font-semibold text-white/80">{title}</h3>
      <p className="max-w-md text-sm text-white/40">{subtitle}</p>
      {actionLabel && typeof onAction === 'function' ? (
        <button type="button" onClick={onAction} className="app-btn-ghost mt-2 inline-flex items-center gap-2">
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
