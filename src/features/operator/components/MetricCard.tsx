import type { Tone } from '../types/operator';

export function MetricCard({ label, value, delta, tone = 'success', note }: { label: string; value: string; delta: string; tone?: Tone; note: string }) {
  return <div className="metric-card"><div className="metric-top"><span className="metric-label">{label}</span><span className={`metric-delta tone-${tone}`}>{delta}</span></div><strong>{value}</strong><small>{note}</small></div>;
}
