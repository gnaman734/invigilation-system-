import StatsCard from '../../components/shared/StatsCard';
import { useInstructors } from '../../lib/hooks/useInstructors';

function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-4 h-8 w-48 animate-pulse rounded bg-slate-200" />
      <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

export default function InstructorProfile() {
  const { instructor, stats, punctualityPercentage, loading, error } = useInstructors();

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  const trendMessage =
    punctualityPercentage >= 90
      ? 'Excellent punctuality record'
      : punctualityPercentage >= 70
        ? 'Good punctuality record'
        : 'Punctuality needs improvement';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold text-[#1A1A2E]">Instructor Profile</h1>

      <div className="app-card mt-6 p-5">
        <p className="text-lg font-semibold text-[#1A1A2E]">{instructor?.name ?? '--'}</p>
        <p className="mt-1 text-sm text-gray-600">{instructor?.email ?? '--'}</p>
        <p className="mt-1 text-sm text-gray-600">Department: {instructor?.department ?? '--'}</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Duties"
          value={stats.total_duties}
          subtitle="Assigned invigilation duties"
          color="blue"
        />
        <StatsCard
          title="On-Time Arrivals"
          value={stats.on_time_arrivals}
          subtitle="Reached before deadline"
          color="green"
        />
        <StatsCard title="Late Arrivals" value={stats.late_arrivals} subtitle="Arrived after deadline" color="red" />
        <StatsCard
          title="Punctuality"
          value={`${punctualityPercentage}%`}
          subtitle="Overall punctuality score"
          color="purple"
        />
      </div>

      <p className="app-card mt-6 px-4 py-3 text-sm font-medium text-gray-700">{trendMessage}</p>
    </div>
  );
}
