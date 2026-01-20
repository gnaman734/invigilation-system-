export function DutyCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
      <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-gray-200" />
      <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-gray-200" />
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
      </div>
      <div className="mt-4 h-8 w-20 animate-pulse rounded bg-gray-200" />
      <div className="mt-3 h-4 w-32 animate-pulse rounded bg-gray-200" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2 rounded-xl border border-gray-100 bg-white p-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-11 animate-pulse rounded bg-gray-200" />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  const heights = ['h-24', 'h-36', 'h-28', 'h-44', 'h-24', 'h-40'];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="mb-4 h-4 w-40 animate-pulse rounded bg-gray-200" />
      <div className="flex h-56 items-end gap-2">
        {heights.map((heightClass, index) => (
          <div key={index} className={`w-full animate-pulse rounded-t bg-gray-200 ${heightClass}`} />
        ))}
      </div>
    </div>
  );
}
