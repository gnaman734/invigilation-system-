const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800 ring-yellow-500/30',
  'on-time': 'bg-green-100 text-green-800 ring-green-500/30',
  late: 'bg-red-100 text-red-800 ring-red-500/30',
  admin: 'bg-[#1E3A5F]/10 text-[#1E3A5F] ring-[#1E3A5F]/20',
  instructor: 'bg-[#2E86AB]/10 text-[#1E3A5F] ring-[#2E86AB]/30',
};

const STATUS_LABELS = {
  pending: 'Pending',
  'on-time': 'On Time',
  late: 'Late',
  admin: 'Admin',
  instructor: 'Instructor',
};

export default function StatusBadge({ status }) {
  if (!status) {
    return null;
  }

  const badgeStyle = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-800 ring-slate-600/20';
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span className={`inline-flex animate-[fade-in-up_150ms_ease-in-out] items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-all duration-150 ease-in-out ${badgeStyle}`}>
      {label}
    </span>
  );
}
