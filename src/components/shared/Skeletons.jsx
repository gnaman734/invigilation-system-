export function DutyCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/8 bg-[#111118] p-4">
      <div className="skeleton h-5 w-2/3" />
      <div className="skeleton mt-3 h-4 w-1/2" />
      <div className="skeleton mt-2 h-4 w-1/3" />
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#111118] p-5">
      <div className="skeleton mb-4 h-3 w-16" />
      <div className="skeleton h-7 w-12" />
      <div className="skeleton mt-3 h-2 w-20" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#111118]">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex gap-4 border-b border-white/4 px-5 py-3.5">
          <div className="skeleton h-3 w-16 rounded-full" />
          <div className="skeleton h-3 w-24 rounded-full" />
          <div className="skeleton h-3 w-20 rounded-full" />
          <div className="skeleton h-3 w-28 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  const heights = ['h-24', 'h-36', 'h-28', 'h-44', 'h-24', 'h-40'];

  return (
    <div className="rounded-2xl border border-white/8 bg-[#111118] p-4">
      <div className="skeleton mb-4 h-4 w-40" />
      <div className="flex h-56 items-end gap-2">
        {heights.map((heightClass, index) => (
          <div key={index} className={`skeleton w-full rounded-t ${heightClass}`} />
        ))}
      </div>
    </div>
  );
}
