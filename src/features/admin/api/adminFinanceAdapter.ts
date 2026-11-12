/** Backend publishes empty OpenAPI schemas for transactions/refunds/financial overview.
 * Do not manufacture monetary values or treat demo rows as real transactions. */
export type JsonRow = Record<string, unknown>;
export function record(value: unknown): JsonRow { return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRow : {}; }
export function extractRows(value: unknown, keys: string[]): JsonRow[] {
  if(Array.isArray(value)) return value.map(record);
  const outer = record(value);
  for(const candidate of [outer, record(outer.data)]) {
    for(const key of [...keys, 'items', 'results', 'data']) if(Array.isArray(candidate[key])) return (candidate[key] as unknown[]).map(record);
  }
  throw new Error('Backend response has no documented array shape; cannot display verified records.');
}
export function field(row: JsonRow, ...keys: string[]): string {
  for(const key of keys) { const v=row[key];if(typeof v === 'string' && v)return v;if(typeof v==='number'&&Number.isFinite(v))return String(v); }
  return '—';
}
export function amount(row: JsonRow, ...keys: string[]): number | null {
  for(const key of keys){const v=row[key];if(typeof v==='number'&&Number.isFinite(v))return v;}
  return null;
}
export function money(value: number | null): string {return value==null?'—':new Intl.NumberFormat('vi-VN', {style:'currency',currency:'VND'}).format(value);}
export function timestamp(row: JsonRow, ...keys: string[]): string {const v=field(row,...keys);if(v==='—')return v;const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString('en-GB');}
