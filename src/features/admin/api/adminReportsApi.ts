import { omitFleetSerialColumns } from '../utils/adminAssetFields';
import { adminFetch } from './adminHttp';
import { AdminApiError, adminRequest } from './adminOperationsApi';

export type ReportRange = { from_date?: string; to_date?: string };
export type MissionReportStatus = '' | 'Completed' | 'Failed' | 'Cancelled';
export type ReportKind = 'revenue' | 'missions' | 'fleet';
export type RevenueDay = { date: string; revenue: number; mission_count: number };
export type MissionDay = { date: string; completed: number; failed: number; cancelled: number };
export type CancellationReason = { reason: string; count: number };
export type CancellationReport = { total: number; reasons: CancellationReason[] };

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const invalid = () => new Error('Unexpected response format.');
function number(value: unknown, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) throw invalid();
  return value;
}
function rows(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value.data)) return value.data;
  if (isRecord(value) && isRecord(value.data) && Array.isArray(value.data.data)) return value.data.data;
  throw invalid();
}
function day(row: Record<string, unknown>): string {
  if (typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw invalid();
  return row.date;
}
export function parseRevenue(value: unknown): RevenueDay[] {
  return rows(value).map(row => {
    if (!isRecord(row)) throw invalid();
    return { date: day(row), revenue: number(row.revenue), mission_count: number(row.mission_count, true) };
  }).sort((a, b) => a.date.localeCompare(b.date));
}
export function parseMissions(value: unknown): MissionDay[] {
  return rows(value).map(row => {
    if (!isRecord(row)) throw invalid();
    return { date: day(row), completed: number(row.completed, true), failed: number(row.failed, true), cancelled: number(row.cancelled, true) };
  }).sort((a, b) => a.date.localeCompare(b.date));
}
export function parseCancellations(value: unknown): CancellationReport {
  const root = isRecord(value) && isRecord(value.data) ? value.data : value;
  if (!isRecord(root) || !Array.isArray(root.distribution)) throw invalid();
  const total = number(root.total_cancelled, true);
  const reasons = root.distribution.map(row => {
    if (!isRecord(row) || typeof row.reason !== 'string') throw invalid();
    return { reason: row.reason.trim() || 'Unspecified', count: number(row.count, true) };
  }).sort((a, b) => b.count - a.count);
  return { total, reasons };
}
export type RatingFilter = '' | '1' | '2' | '3' | '4' | '5';
export type CustomerRating = { id: number; order_id: string; customer_id: string; rating: number; comment: string; created_at: string };
export type RatingReport = { total: number; average: number | null; distribution: { stars: number; count: number }[] | null; ratings: CustomerRating[] };

export function parseRatings(value: unknown): RatingReport {
  const root = isRecord(value) && isRecord(value.data) ? value.data : value;
  if (!isRecord(root) || !Array.isArray(root.ratings)) throw invalid();
  const total = number(root.total_ratings, true);
  const average = total === 0 ? null : number(root.avg_rating);
  if (average !== null && (average < 1 || average > 5)) throw invalid();
  const raw = root.distribution;
  let distribution: RatingReport['distribution'] = null;
  // Swagger does not specify distribution values. Accept numeric counts or { count }.
  if (isRecord(raw)) {
    const parsed = [5, 4, 3, 2, 1].map(stars => {
      const entry = raw[String(stars)];
      const n = entry === undefined ? 0 : isRecord(entry) ? entry.count : entry;
      return { stars, count: typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : NaN };
    });
    if (Object.keys(raw).every(key => /^[1-5]$/.test(key)) && parsed.every(row => Number.isFinite(row.count)) && parsed.reduce((sum, row) => sum + row.count, 0) === total) distribution = parsed;
  }
  const ratings = root.ratings.map(row => {
    if (!isRecord(row) || typeof row.order_id !== 'string' || typeof row.customer_id !== 'string' || typeof row.created_at !== 'string' || (row.comment != null && typeof row.comment !== 'string')) throw invalid();
    const rating = number(row.rating, true);
    if (rating < 1 || rating > 5) throw invalid();
    return { id: number(row.id, true), order_id: row.order_id, customer_id: row.customer_id, rating, comment: typeof row.comment === 'string' ? row.comment : '', created_at: row.created_at };
  });
  return { total, average, distribution, ratings };
}

export function ratingsQuery(rating: RatingFilter, limit: number, offset: number) {
  if ((rating !== '' && !/^[1-5]$/.test(rating)) || !Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isSafeInteger(offset) || offset < 0) throw new Error('Invalid rating filter.');
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (rating) query.set('rating', rating);
  return `?${query.toString()}`;
}

export function reportQuery(range: ReportRange = {}, status: MissionReportStatus = '') {
  const query = new URLSearchParams();
  if (range.from_date) query.set('from_date', range.from_date);
  if (range.to_date) query.set('to_date', range.to_date);
  if (status) query.set('status', status);
  return query.size ? `?${query.toString()}` : '';
}

// CSV responses must not pass through the JSON/text API adapter.
async function exportCsv(kind: ReportKind, range: ReportRange = {}, status: MissionReportStatus = '') {
  const query = kind === 'fleet' ? '' : reportQuery(range, kind === 'missions' ? status : '');
  const path = `/admin/reports/${kind}.csv${query}`;
  let response: Response;
  try {
    response = await adminFetch(path, { headers: { Accept: 'text/csv, application/octet-stream, text/plain' } });
  } catch { throw new AdminApiError('Unable to connect.', 0); }
  if (!response.ok) throw new AdminApiError('Unable to download report.', response.status);
  const type = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (/json|html|xml/.test(type)) throw invalid();
  const blob = await response.blob();
  const prefix = (await blob.slice(0, 1024).text()).replace(/^\uFEFF/, '').trimStart();
  if (!prefix || /^[{[<]/.test(prefix) || !prefix.split(/\r?\n/, 1)[0].includes(',')) throw invalid();
  const exportBlob = kind === 'fleet' ? new Blob([omitFleetSerialColumns(await blob.text())], { type: 'text/csv;charset=utf-8' }) : blob;
  const url = URL.createObjectURL(exportBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `droneoptai-${kind}${kind !== 'fleet' && range.from_date ? `-from-${range.from_date}` : ''}${kind !== 'fleet' && range.to_date ? `-to-${range.to_date}` : ''}.csv`;
  document.body.appendChild(a);
  try { a.click(); } finally { a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

export const adminReportsApi = {
  revenue: async (days: number) => parseRevenue(await adminRequest<unknown>(`/admin/reports/chart/revenue?days=${days}`)),
  missions: async (days: number) => parseMissions(await adminRequest<unknown>(`/admin/reports/chart/missions?days=${days}`)),
  cancellations: async (range: ReportRange) => parseCancellations(await adminRequest<unknown>(`/admin/reports/cancellation-stats${reportQuery(range)}`)),
  ratings: async (rating: RatingFilter, limit: number, offset: number) => parseRatings(await adminRequest<unknown>(`/admin/orders/ratings${ratingsQuery(rating, limit, offset)}`)),
  exportCsv,
};
