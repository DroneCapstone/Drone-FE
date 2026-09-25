export const OPERATOR_PAGE_SIZE = 10;

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
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  const goToPage = (nextPage: number) => {
    onPageChange(Math.min(Math.max(nextPage, 1), totalPages));
  };

  return (
    <div className={`operator-pagination ${className}`.trim()}>
      <small>
        Showing {firstItem}–{lastItem} of {totalItems} {itemLabel}
      </small>

      <div className="operator-pagination-controls" aria-label={`${itemLabel} pagination`}>
        <button type="button" disabled={page === 1} onClick={() => goToPage(page - 1)}>
          Previous
        </button>

        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={pageNumber === page ? 'is-active' : ''}
            aria-current={pageNumber === page ? 'page' : undefined}
            aria-label={`Page ${pageNumber}`}
            onClick={() => goToPage(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}

        <button type="button" disabled={page === totalPages} onClick={() => goToPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
