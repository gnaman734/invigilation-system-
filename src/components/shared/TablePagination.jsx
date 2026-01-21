export default function TablePagination({ totalItems, page, pageSize = 10, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil((totalItems ?? 0) / pageSize));
  if (totalItems <= pageSize) {
    return null;
  }

  return (
    <div className="flex items-center justify-between border-t border-white/6 px-3 py-3 text-sm">
      <p className="text-white/35">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className="app-btn-ghost px-3 py-1.5" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>
          Previous
        </button>
        <button
          type="button"
          className="app-btn-ghost px-3 py-1.5"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
