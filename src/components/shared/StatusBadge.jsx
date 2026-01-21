import { Badge } from '../ui/badge';

const STATUS_STYLES = {
  pending: 'border-amber-500/20 text-amber-400/80 bg-amber-500/8',
  approved: 'border-green-500/20 text-green-400/80 bg-green-500/8',
  rejected: 'border-red-500/20 text-red-400/80 bg-red-500/8',
  'on-time': 'border-green-500/20 text-green-400/80 bg-green-500/8',
  late: 'border-red-500/20 text-red-400/80 bg-red-500/8',
  admin: 'border-purple-500/20 text-purple-400/80 bg-purple-500/8',
  instructor: 'border-blue-500/20 text-blue-400/80 bg-blue-500/8',
  overloaded: 'border-red-500/20 text-red-400/80 bg-red-500/8',
  balanced: 'border-green-500/20 text-green-400/80 bg-green-500/8',
  underutilized: 'border-amber-500/20 text-amber-400/80 bg-amber-500/8',
};

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  'on-time': 'On Time',
  late: 'Late',
  admin: 'Admin',
  instructor: 'Instructor',
  overloaded: 'Overloaded',
  balanced: 'Balanced',
  underutilized: 'Underutilized',
};

export default function StatusBadge({ status }) {
  if (!status) {
    return null;
  }

  const badgeStyle = STATUS_STYLES[status] ?? 'border-white/15 text-white/60 bg-white/5';
  const label = STATUS_LABELS[status] ?? status;

  return (
    <Badge className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${badgeStyle}`}>
      {label}
    </Badge>
  );
}
