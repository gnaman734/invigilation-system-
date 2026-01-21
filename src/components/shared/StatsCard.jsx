const COLOR_STYLES = {
  green: {
    icon: 'bg-white/5 text-white/30',
    trendPositive: 'text-emerald-300',
    trendNegative: 'text-red-300',
  },
  red: {
    icon: 'bg-white/5 text-white/30',
    trendPositive: 'text-emerald-300',
    trendNegative: 'text-red-300',
  },
  blue: {
    icon: 'bg-white/5 text-white/30',
    trendPositive: 'text-emerald-300',
    trendNegative: 'text-red-300',
  },
  yellow: {
    icon: 'bg-white/5 text-white/30',
    trendPositive: 'text-emerald-300',
    trendNegative: 'text-red-300',
  },
  purple: {
    icon: 'bg-white/5 text-white/30',
    trendPositive: 'text-emerald-300',
    trendNegative: 'text-red-300',
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
      className={`app-card card-interactive fade-up p-5 ${onClick ? 'app-card-interactive' : ''}`}
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
        <p className="app-label flex-1">{title}</p>
        {Icon ? (
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${style.icon}`}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-3xl font-bold text-white/90">{value}</p>
      {subtitle ? <p className="mt-2 text-sm text-white/35">{subtitle}</p> : null}
      {trend ? (
        <p className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${trendClassName}`}>
          {trendDirection === 'down' ? '↓' : '↑'} {trend}
        </p>
      ) : null}
    </article>
  );
}
