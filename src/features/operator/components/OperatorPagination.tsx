import './operator-pagination.css';
import type { MouseEvent } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/shadcn/ui/pagination';
import { cn } from '@/lib/utils';

export const OPERATOR_PAGE_SIZE = 10;

type PaginationEntry = number | 'start-ellipsis' | 'end-ellipsis';

function getPaginationEntries(currentPage: number, totalPages: number): PaginationEntry[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 'end-ellipsis', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'start-ellipsis', totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'start-ellipsis', currentPage, 'end-ellipsis', totalPages];
}

interface OperatorPaginationProps {
  currentPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  itemLabel?: string;
  className?: string;
}

export function OperatorPagination({
  currentPage,
  totalItems,
  onPageChange,
  pageSize = OPERATOR_PAGE_SIZE,
  itemLabel = 'items',
  className = '',
}: OperatorPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(currentPage, 1), totalPages);
  const paginationEntries = getPaginationEntries(page, totalPages);
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);

  const goToPage = (event: MouseEvent<HTMLAnchorElement>, nextPage: number) => {
    event.preventDefault();
    onPageChange(Math.min(Math.max(nextPage, 1), totalPages));
  };

  return (
    <div className={`operator-pagination operator-pagination--technician ${className}`.trim()}>
      <span className="operator-pagination__summary">
        Showing {rangeStart}–{rangeEnd} of {totalItems} {itemLabel}
      </span>
      <Pagination aria-label={`${itemLabel} pagination`} className="operator-pagination__nav mx-0 w-auto justify-end">
        <PaginationContent className="gap-2">
          <PaginationItem>
            <PaginationPrevious
              href={`#page-${Math.max(page - 1, 1)}`}
              aria-disabled={page === 1}
              tabIndex={page === 1 ? -1 : undefined}
              className={cn(
                'operator-pagination__link',
                page === 1 && 'pointer-events-none opacity-50',
              )}
              onClick={(event) => goToPage(event, page - 1)}
            />
          </PaginationItem>

          {paginationEntries.map((entry) => {
            if (typeof entry !== 'number') {
              return (
                <PaginationItem key={entry}>
                  <PaginationEllipsis className="operator-pagination__ellipsis" />
                </PaginationItem>
              );
            }

            const isActive = entry === page;

            return (
              <PaginationItem key={entry}>
                <PaginationLink
                  href={`#page-${entry}`}
                  className="operator-pagination__link"
                  isActive={isActive}
                  onClick={(event) => goToPage(event, entry)}
                >
                  {entry}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          <PaginationItem>
            <PaginationNext
              href={`#page-${Math.min(page + 1, totalPages)}`}
              aria-disabled={page === totalPages}
              tabIndex={page === totalPages ? -1 : undefined}
              className={cn(
                'operator-pagination__link',
                page === totalPages && 'pointer-events-none opacity-50',
              )}
              onClick={(event) => goToPage(event, page + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
