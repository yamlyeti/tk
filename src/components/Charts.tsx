import './Charts.css';

const DONUT_COLORS = ['#F0D060', '#D4AF37', '#C8960A', '#B8860B', '#a67c00', '#8B6508'];

interface DonutChartProps {
  data: { label: string; percentage: number; formattedValue: string }[];
  emptyLabel?: string;
}

export function DonutChart({ data, emptyLabel = 'No data yet' }: DonutChartProps) {
  if (data.length === 0) {
    return <p className="chart-empty">{emptyLabel}</p>;
  }

  let cumulative = 0;
  const stops = data
    .map((d, i) => {
      const start = cumulative;
      cumulative += d.percentage;
      return `${DONUT_COLORS[i % DONUT_COLORS.length]} ${start}% ${cumulative}%`;
    })
    .join(', ');

  return (
    <div className="donut-chart-wrap">
      <div className="donut-chart" style={{ background: `conic-gradient(${stops})` }}>
        <div className="donut-chart-hole" />
      </div>
      <ul className="donut-legend">
        {data.map((d, i) => (
          <li key={d.label}>
            <span className="donut-legend-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="donut-legend-label">{d.label}</span>
            <span className="donut-legend-value">{d.formattedValue}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface TrendBarChartProps {
  data: { label: string; value: number }[];
  emptyLabel?: string;
}

export function TrendBarChart({ data, emptyLabel = 'No data yet' }: TrendBarChartProps) {
  if (data.length === 0) {
    return <p className="chart-empty">{emptyLabel}</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="trend-bar-chart">
      {data.map((d) => (
        <div key={d.label} className="trend-bar-col">
          <div className="trend-bar-track">
            <div
              className="trend-bar-fill"
              style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 3 : 0)}%` }}
              title={d.label}
            />
          </div>
          <span className="trend-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
