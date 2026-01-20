const COLOR_STYLES = {
  green: {
    border: 'border-l-[#27AE60]',
    icon: 'bg-green-100 text-green-700',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600',
  },
  red: {
    border: 'border-l-[#E74C3C]',
    icon: 'bg-red-100 text-red-700',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600',
  },
  blue: {
    border: 'border-l-[#2E86AB]',
    icon: 'bg-blue-100 text-blue-700',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600',
  },
  yellow: {
    border: 'border-l-[#F39C12]',
    icon: 'bg-yellow-100 text-yellow-700',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600',
  },
  purple: {
    border: 'border-l-[#8E44AD]',
    icon: 'bg-purple-100 text-purple-700',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600',
  },
};

export default function StatsCard({
  title,
  value,
  subtitle,
  color = 'blue',
  icon: Icon = null,
  trend = null,
  trendDirection = 'up',
  onClick = null,
}) {
  const style = COLOR_STYLES[color] ?? COLOR_STYLES.blue;
  const trendClassName = trendDirection === 'down' ? style.trendNegative : style.trendPositive;

  return (
    <article
      className={`app-card border-l-4 ${style.border} ${onClick ? 'app-card-interactive' : ''}`}
      onClick={onClick ?? undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <p className="app-label">{title}</p>
        {Icon ? (
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${style.icon}`}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-3xl font-bold text-[#1A1A2E]">{value}</p>
      {subtitle ? <p className="mt-2 text-sm text-gray-600">{subtitle}</p> : null}
      {trend ? (
        <p className={`mt-2 text-sm font-medium ${trendClassName}`}>
          {trendDirection === 'down' ? '↓' : '↑'} {trend}
        </p>
      ) : null}
    </article>
  );
}
