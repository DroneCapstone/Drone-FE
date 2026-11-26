import type { NotificationApi } from '../api/adminOperationsApi';

export type NotificationTarget = { to: string; label: string };

export function notificationTarget(item: NotificationApi): NotificationTarget | null {
  const type = String(item.notifications_type ?? '').toLowerCase();
  const reference = String(item.reference_id ?? '').trim();
  const text = `${item.title ?? ''} ${item.message ?? ''}`;
  const full = `${reference} ${text}`;
  const order = full.match(/(?:^|[^A-Z0-9])(ORD-\d{8}-\d+)(?![A-Z0-9])/i)?.[1]?.toUpperCase();
  const drone = String(item.drone_id ?? '').trim();
  if (type === 'payment') {
    const refund = /\brefund(?:ed|s|ing)?\b/i.test(text) || /REFUND/i.test(reference);
    const path = refund ? '/admin/payments/refunds' : '/admin/payments/transactions';
    return { to: order ? `${path}?q=${encodeURIComponent(order)}` : path, label: refund ? 'View refunds' : order ? 'View transaction' : 'View transactions' };
  }
  if (/replacement[\s_-]+request|replacement[\s_-]+(?:battery|part)|(?:battery|part)[\s_-]+replacement/i.test(full)) {
    // A bare reference is only interpreted as a request ID when the notification explicitly identifies a replacement request.
    const match = full.match(/(?:^|[^a-z0-9])replacement[\s_-]+request(?:[\s_:#-]+(?:id[\s_:#-]+)?)?(\d+)(?![a-z0-9])/i);
    const raw = match?.[1] ?? (/^\d+$/.test(reference) && /replacement[\s_-]+request/i.test(text) ? reference : '');
    const id = Number(raw);
    return Number.isSafeInteger(id) && id > 0
      ? { to: `/admin/replacement/requests?request=${id}`, label: 'View request' }
      : { to: '/admin/replacement/requests', label: 'View replacement records' };
  }
  if (/low[\s_-]+stock|stock[\s_-]+(?:alert|threshold)|out[\s_-]+of[\s_-]+stock/i.test(full) && !/\bbatter(?:y|ies)\b/i.test(text)) {
    return { to: '/admin/replacement/spare-parts?stock=LOW', label: 'View stock' };
  }
  if (drone && drone !== '0' && ['maintenance', 'mission_status', 'ai_warning', 'system_alert'].includes(type)) {
    const tab = type === 'maintenance' ? (item.work_order_id ? '?tab=orders' : '?tab=maintenance') : '';
    return { to: `/admin/network/drones/${encodeURIComponent(drone)}${tab}`, label: type === 'maintenance' ? 'View maintenance' : 'View drone' };
  }
  return null;
}
