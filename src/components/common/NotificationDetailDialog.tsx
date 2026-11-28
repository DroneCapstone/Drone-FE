import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config/api';

export interface ChecklistItem {
  item_name?: string;
  item?: string;
  is_completed?: boolean;
  checked?: boolean;
  note?: string | null;
}

export interface NotificationStandardDetails {
  event?: string | null;
  stage?: string | null;
  stage_label?: string | null;
  hub_role?: string | null;
  hub_passed_at?: string | null;
  weather_snapshot?: Record<string, unknown> | null;
  order_id?: string | null;
  mission_id?: string | null;
  hub_name?: string | null;
  relay_hub_name?: string | null;
  drone_id?: string | null;
  battery_id?: string | null;
  work_order_id?: number | null;
  weather_evidence?: Record<string, unknown> | null;
  checklist?: ChecklistItem[] | null;
  proof_image_url?: string | null;
  note?: string | null;
}

export interface NotificationDetailData {
  notification: {
    id: number;
    title: string;
    message: string;
    notifications_type: string;
    created_at: string;
    reference_id?: string | null;
    mission_id?: string | null;
    drone_id?: string | number | null;
    work_order_id?: number | null;
    image_urls?: string[] | null;
    payload?: Record<string, unknown> | null;
  };
  /** Dữ liệu chi tiết CHUẨN, giống nhau cho cả 4 role (BE: app/shared/notification_payload.py). */
  details: NotificationStandardDetails;
  order?: Record<string, unknown> | null;
  mission?: Record<string, unknown> | null;
  drone?: Record<string, unknown> | null;
  evidence: Array<{
    id: number | null;
    stage: string;
    stage_label: string;
    url: string;
    note?: string | null;
    created_at?: string | null;
    from_this_notification?: boolean;
  }>;
}

/** Ảnh trả về có thể là URL tuyệt đối hoặc đường dẫn tương đối (/api/v1/uploads/...). */
export function resolveImageUrl(url: string): string {
  if (/^(https?:|data:)/i.test(url)) return url;
  try {
    return new URL(url, API_BASE_URL).href;
  } catch {
    return url;
  }
}

const LABELS: Record<string, string> = {
  id: 'ID', status: 'Status', handling_status: 'Handling', delivery_mode: 'Delivery mode',
  package_label: 'Package', payload_kg: 'Payload (kg)', origin_hub_name: 'Origin hub',
  destination_hub_name: 'Destination hub', estimated_arrival: 'Estimated arrival', receiver_name: 'Recipient',
  is_aging_priority: 'Aging priority', order_id: 'Order', scheduled_time: 'Scheduled', arrived_at: 'Arrived at',
  name: 'Name', model: 'Model', battery_level_pct: 'Battery (%)', current_hub_name: 'Current hub',
};
const HIDDEN = new Set(['origin_hub_id', 'destination_hub_id']);

const DETAIL_FIELDS: Array<[keyof NotificationStandardDetails, string]> = [
  ['stage_label', 'Stage'], ['event', 'Event'], ['hub_role', 'Hub role'], ['order_id', 'Order'], ['mission_id', 'Mission'], ['hub_name', 'Hub'],
  ['relay_hub_name', 'Relay hub'], ['drone_id', 'Drone'], ['battery_id', 'Battery'], ['work_order_id', 'Work order'],
];

const WEATHER_LABELS: Record<string, string> = {
  temperature_c: 'Temperature (°C)', humidity_pct: 'Humidity (%)', wind_speed_ms: 'Wind (m/s)', wind_gust_ms: 'Gust (m/s)',
  wind_direction_deg: 'Wind direction (°)', precipitation_mm: 'Rain (mm)', pressure_hpa: 'Pressure (hPa)',
  cloud_cover_pct: 'Cloud cover (%)', observed_at: 'Observed at', summary: 'Summary', reason: 'Reason',
};

function StandardDetails({ details, onZoom }: { details: NotificationStandardDetails; onZoom: (url: string) => void }) {
  const rows = DETAIL_FIELDS.filter(([key]) => details[key] !== null && details[key] !== undefined && details[key] !== '');
  const weather = details.weather_evidence ? Object.entries(details.weather_evidence) : [];
  const checklist = details.checklist ?? [];
  return (
    <div className="mt-3 space-y-3">
      {rows.length > 0 && (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Event details</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
            {rows.map(([key, label]) => (
              <div key={key} className="contents"><dt className="text-white/50">{label}</dt><dd className="break-words text-white">{String(details[key])}</dd></div>
            ))}
          </dl>
          {details.note && <p className="mt-2 text-[12px] text-white/60">Note: {details.note}</p>}
        </section>
      )}
      {weather.length > 0 && (
        <section className="rounded-xl border border-sky-400/20 bg-sky-400/[0.05] p-3">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-300/80">Weather evidence</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
            {weather.map(([key, value]) => (
              <div key={key} className="contents"><dt className="text-white/50">{WEATHER_LABELS[key] ?? key.replace(/_/g, ' ')}</dt><dd className="text-white">{String(value)}</dd></div>
            ))}
          </dl>
        </section>
      )}
      {checklist.length > 0 && (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Checklist</h3>
          <ul className="space-y-1 text-[13px]">
            {checklist.map((entry, index) => {
              const done = Boolean(entry.is_completed ?? entry.checked);
              return <li key={index} className="flex items-start gap-2"><span aria-hidden="true" className={done ? 'text-emerald-400' : 'text-white/30'}>{done ? '\u2713' : '\u25CB'}</span><span className={done ? 'text-white' : 'text-white/70'}>{entry.item_name ?? entry.item ?? 'Item'}{entry.note ? ` \u2014 ${entry.note}` : ''}</span></li>;
            })}
          </ul>
        </section>
      )}
      {details.proof_image_url && (
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Proof image</h3>
          <button type="button" className="block w-full overflow-hidden rounded-xl border border-white/10" onClick={() => onZoom(resolveImageUrl(details.proof_image_url as string))} aria-label="View proof image">
            <img src={resolveImageUrl(details.proof_image_url)} alt="Proof" loading="lazy" className="max-h-64 w-full object-cover" />
          </button>
        </section>
      )}
    </div>
  );
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /(_at|_time|arrival)$/.test(key)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleString('en-GB');
  }
  return String(value);
}

function ContextCard({ title, data }: { title: string; data?: Record<string, unknown> | null }) {
  if (!data) return null;
  const rows = Object.entries(data).filter(([key]) => !HIDDEN.has(key));
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">{title}</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
        {rows.map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="text-white/50">{LABELS[key] ?? key.replace(/_/g, ' ')}</dt>
            <dd className="break-words text-white">{formatValue(key, value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

interface Props {
  /** Gọi API chi tiết của role hiện tại (GET /notifications/{id}/detail). */
  load: () => Promise<NotificationDetailData>;
  /** Nút mở trang liên quan (đơn / chuyến bay). Bỏ qua nếu không có. */
  onOpenRelated?: () => void;
  relatedLabel?: string;
  onClose: () => void;
}

export function NotificationDetailDialog({ load, onOpenRelated, relatedLabel = 'Open related page', onClose }: Props) {
  const [detail, setDetail] = useState<NotificationDetailData | null>(null);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    load()
      .then(value => { if (active) setDetail(value); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load notification details.'); });
    return () => { active = false; };
    // load được tạo mới mỗi lần mở dialog (dialog được mount theo từng thông báo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (zoom) setZoom(null); else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom, onClose]);

  const n = detail?.notification;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Notification details" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-[640px] overflow-y-auto rounded-2xl border border-white/10 bg-[#161217] p-5 text-white shadow-2xl" onClick={event => event.stopPropagation()}>
        {!detail && !error && <p className="py-10 text-center text-sm text-white/60">Loading details…</p>}
        {error && <p role="alert" className="py-6 text-center text-sm text-red-400">{error}</p>}
        {n && detail && <>
          <header className="mb-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">
              {n.notifications_type.replace(/_/g, ' ')} · {new Date(n.created_at).toLocaleString('en-GB')}
            </p>
            <h2 className="mt-1 text-[17px] font-semibold">{n.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-white/80">{n.message}</p>
          </header>

          {detail.details && <StandardDetails details={detail.details} onZoom={setZoom} />}

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ContextCard title="Order" data={detail.order} />
            <ContextCard title="Mission" data={detail.mission} />
            <ContextCard title="Drone" data={detail.drone} />
          </div>

          <section className="mt-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
              Evidence photos ({detail.evidence.length})
            </h3>
            {detail.evidence.length === 0
              ? <p className="text-[13px] text-white/50">No evidence photos for this event.</p>
              : <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {detail.evidence.map(item => (
                  <li key={item.url} className="overflow-hidden rounded-lg border border-white/10 bg-black/30">
                    <button type="button" className="block w-full" onClick={() => setZoom(resolveImageUrl(item.url))} aria-label={`View photo: ${item.stage_label}`}>
                      <img src={resolveImageUrl(item.url)} alt={item.stage_label} loading="lazy" className="h-28 w-full object-cover" />
                    </button>
                    <p className="px-2 py-1 text-[11px] text-white/70">
                      {item.stage_label}{item.from_this_notification ? ' · this event' : ''}
                      {item.note ? <span className="block text-white/50">{item.note}</span> : null}
                    </p>
                  </li>
                ))}
              </ul>}
          </section>
        </>}

        <footer className="mt-5 flex justify-end gap-2">
          {onOpenRelated && detail && (
            <button type="button" onClick={onOpenRelated} className="h-10 rounded-xl bg-emerald-500 px-4 text-[13px] font-semibold text-black hover:bg-emerald-400">{relatedLabel}</button>
          )}
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/15 px-4 text-[13px] font-semibold text-white/80 hover:bg-white/[0.06]">Close</button>
        </footer>
      </div>

      {zoom && (
        <div className="fixed inset-0 z-[310] flex items-center justify-center bg-black/85 p-4" onClick={event => { event.stopPropagation(); setZoom(null); }}>
          <img src={zoom} alt="Evidence" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
