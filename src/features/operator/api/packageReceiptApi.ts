import { operatorApiRequest } from './orderApi';

export interface PackageReceiptPhoto {
  url: string;
  hubId: string;
  hubName: string;
  recordedAt: string;
  recordedBy: string;
}

type RecordData = Record<string, unknown>;
const record = (value: unknown): RecordData =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as RecordData : {};

function text(value: RecordData, ...keys: string[]): string {
  for (const key of keys) {
    const item = value[key];
    if ((typeof item === 'string' || typeof item === 'number') && String(item).trim()) return String(item).trim();
  }
  return '';
}

function rows(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const data = record(value);
  for (const key of ['data', 'proof_images', 'order_proof_images', 'proof_images_json', 'items', 'results']) {
    const candidate = data[key];
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') {
      try { return rows(candidate); } catch { /* Try the next supported envelope. */ }
    }
  }
  throw new Error('Unable to read package receipt records.');
}

const receiptStages = new Set([
  'PACKAGE_RECEIVED_AT_ORIGIN_HUB', 'RECEIVE_PACKAGE', 'PACKAGE_RECEIVED', 'RECEIVED_AT_HUB',
]);

function imageUrls(data: RecordData): string[] {
  const values = [data.proof_image_url, data.photo_url, data.image_url,
    ...(Array.isArray(data.photo_urls) ? data.photo_urls : []),
    ...(Array.isArray(data.proof_image_urls) ? data.proof_image_urls : [])];
  return [...new Set(values.filter((value): value is string => {
    if (typeof value !== 'string') return false;
    if (/^data:image\/(?:png|jpeg|jpg|webp|gif|avif);base64,[A-Za-z0-9+/]/i.test(value)) return true;
    try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
  }))];
}

function validTime(value: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4}),?\s+(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  const normalized = match ? `${match[3]}-${match[2]}-${match[1]}T${match[4]}:${match[5]}:${match[6] || '00'}+07:00` : value;
  return normalized && Number.isFinite(Date.parse(normalized)) ? normalized : '';
}

/** Uses the per-order proof response format already consumed by Admin.
 * Never use the Admin endpoint with an Operator token. BE must expose/authorize this route. */
export async function getPackageReceiptApi(orderId: string, originHubId: string, signal?: AbortSignal): Promise<PackageReceiptPhoto[]> {
  const payload = await operatorApiRequest<unknown>(
    `/operator/orders/${encodeURIComponent(orderId)}/proof-images`, { signal },
  );
  return mapPackageReceiptPhotos(payload, orderId, originHubId);
}

export function mapPackageReceiptPhotos(payload: unknown, orderId: string, originHubId: string): PackageReceiptPhoto[] {
  const responseOrder = text(record(payload), 'order_id');
  if (responseOrder && responseOrder !== orderId) throw new Error('Order identifier does not match.');
  const photos = rows(payload).flatMap((item) => {
    const data = record(item);
    const stage = text(data, 'stage').toUpperCase().replace(/[\s-]+/g, '_');
    const eventOrder = text(data, 'order_id');
    const hubId = text(data, 'hub_id');
    if (!receiptStages.has(stage) || (eventOrder && eventOrder !== orderId) || (hubId && originHubId && hubId !== originHubId)) return [];
    return imageUrls(data).map(url => ({
      url, hubId, hubName: text(data, 'hub_name'),
      recordedAt: validTime(text(data, 'recorded_at', 'timestamp')),
      recordedBy: text(data, 'technician_name', 'technician_id'),
    }));
  });
  photos.sort((a, b) => (Date.parse(b.recordedAt) || 0) - (Date.parse(a.recordedAt) || 0));
  const unique = new Map<string, PackageReceiptPhoto>();
  for (const photo of photos) if (!unique.has(photo.url)) unique.set(photo.url, photo);
  return [...unique.values()];
}
