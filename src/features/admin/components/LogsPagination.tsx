import { ActionButton } from '../../../components/ui/ActionButton';

export function LogsPagination({ page, pageSize, total, loading, onPageChange }: {
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-border)] px-5 py-4">
    <span className="text-xs text-[var(--admin-muted)]">{first}–{last} of {total} records</span>
    <div className="flex items-center gap-3">
      <ActionButton variant="secondary" disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)}>Previous</ActionButton>
      <span className="text-xs">Page {page} / {pages}</span>
      <ActionButton variant="secondary" disabled={page >= pages || loading} onClick={() => onPageChange(page + 1)}>Next</ActionButton>
    </div>
  </div>;
}
