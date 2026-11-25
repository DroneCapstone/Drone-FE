import { API_BASE_URL, API_WITH_CREDENTIALS } from '../../../config/api';
import { authService } from '../../auth/services/authService';
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
  const send = (token: string | null) => {
    const headers = new Headers({ Accept: 'text/csv, application/octet-stream, text/plain' });
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(`${API_BASE_URL}${path}`, { headers, credentials: API_WITH_CREDENTIALS ? 'include' : 'omit' });
  };
  let response: Response;
  try {
    const token = authService.getAccessToken();
    response = await send(token);
    if (response.status === 401 && token) {
      const refreshed = await authService.refreshAccessToken();
      if (refreshed) response = await send(refreshed);
    }
  } catch { throw new AdminApiError('Unable to connect.', 0); }
  if (!response.ok) throw new AdminApiError('Unable to download report.', response.status);
  const type = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (/json|html|xml/.test(type)) throw invalid();
  const blob = await response.blob();
  const prefix = (await blob.slice(0, 1024).text()).replace(/^\uFEFF/, '').trimStart();
  if (!prefix || /^[{[<]/.test(prefix) || !prefix.split(/\r?\n/, 1)[0].includes(',')) throw invalid();
  const url = URL.createObjectURL(blob);
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
  exportCsv,
};
