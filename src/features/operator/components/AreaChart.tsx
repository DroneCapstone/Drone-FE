import { useId } from 'react';

interface AreaChartProps {
  orange?: boolean;
  unit?: string;
  yLabels?: string[];
  pointLabel?: string;
  variant?: 'throughput' | 'energy' | 'performance' | 'simulation';
}

const chartPaths = {
  throughput: {
    line: 'M0 174 C45 166,72 150,110 154 S175 126,220 136 S290 107,330 112 S395 83,440 94 S505 72,550 78 S620 42,670 55 S745 31,800 38',
    dot: [670, 55],
  },
  energy: {
    line: 'M0 54 C60 63,80 80,135 72 S210 92,265 86 S340 112,395 103 S475 132,530 120 S615 148,675 139 S750 166,800 154',
    dot: [675, 139],
  },
  performance: {
    line: 'M0 151 C55 139,88 142,130 119 S210 135,255 104 S330 92,380 101 S455 66,510 79 S590 55,640 64 S730 42,800 48',
    dot: [640, 64],
  },
  simulation: {
    line: 'M0 169 C58 160,92 130,145 137 S218 101,270 116 S350 82,405 91 S485 63,540 76 S620 49,675 70 S750 44,800 57',
    dot: [675, 70],
  },
} as const;

export function AreaChart({ orange = false, unit = '', yLabels = ['100', '75', '50', '25'], pointLabel = 'Current selected value', variant = 'performance' }: AreaChartProps) {
  const chartId = useId().replace(/:/g, '');
  const gradientId = orange ? 'fill-orange' : 'fill-blue';
  const path = chartPaths[variant];
  return (
    <div className="area-chart-frame">
      {unit && <span className="chart-unit">{unit}</span>}
      <div className="chart-y-axis">{yLabels.map((label) => <span key={label}>{label}</span>)}</div>
      <svg className="area-chart" viewBox="0 0 800 220" preserveAspectRatio="none" role="img" aria-label={`Operational trend, measured in ${unit || 'units'}`}>
        <defs><linearGradient id={`${gradientId}-${chartId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={orange ? '#ff6b00' : '#4aa3ff'} stopOpacity=".18"/><stop offset="1" stopColor={orange ? '#ff6b00' : '#4aa3ff'} stopOpacity="0"/></linearGradient></defs>
        {[35, 80, 125, 170].map((y) => <line key={y} x1="0" x2="800" y1={y} y2={y} className="chart-grid" />)}
        <path d={`${path.line} L800 220 L0 220Z`} fill={`url(#${gradientId}-${chartId})`} />
        <path d={path.line} className={orange ? 'chart-line orange' : 'chart-line'} />
        <circle cx={path.dot[0]} cy={path.dot[1]} r="5" className="chart-dot"><title>{pointLabel}</title></circle>
      </svg>
    </div>
  );
}
