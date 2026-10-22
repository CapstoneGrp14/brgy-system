import { useEffect, useMemo, useState } from 'react';

/**
 * Search + filter + pagination for a list the client already holds.
 *
 * These queues are bounded by the size of one barangay — a few hundred rows at
 * the outside — and their hooks already fetch the whole set to compute the
 * header counts. Filtering in the browser therefore costs nothing extra and
 * keeps the filters instant, where a server round-trip per keystroke would
 * make them feel slower than scrolling.
 *
 * `searchable` returns the text a row should be findable by. Return every field
 * a clerk would type in — a resident's name, a reference number, a surname
 * fragment — because searching only the visible column surprises people.
 */
export interface TableView<T> {
  query: string;
  setQuery: (q: string) => void;
  /** Rows for the current page — what the table body should render. */
  rows: T[];
  /** Rows surviving search + filters, across all pages. */
  matched: T[];
  /** Rows before any filtering, for "filtered from {n}" copy. */
  total: number;
  page: number;
  setPage: (p: number) => void;
  pageCount: number;
  /** 1-based index of the first row on this page; 0 when nothing matched. */
  from: number;
  to: number;
  /** True when search or a filter is narrowing the list. */
  filtered: boolean;
}

export function useTableView<T>(
  all: T[] | undefined,
  searchable: (row: T) => string,
  options: {
    pageSize?: number;
    /** Extra predicates, e.g. a status dropdown. Falsy entries are ignored. */
    filters?: (((row: T) => boolean) | null | undefined | false)[];
    /** Changing this resets to page 1 — pass the active filter values. */
    resetKey?: unknown;
  } = {},
): TableView<T> {
  const { pageSize = 10, filters = [], resetKey } = options;
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const list = all ?? [];
  const term = query.trim().toLowerCase();
  const active = filters.filter(Boolean) as ((row: T) => boolean)[];

  const matched = useMemo(
    () =>
      list.filter(
        (row) =>
          (!term || searchable(row).toLowerCase().includes(term)) &&
          active.every((f) => f(row)),
      ),
    // `active` and `searchable` are rebuilt every render by callers passing
    // inline arrows, so depending on them would recompute on every render and
    // defeat the memo. The filter *values* are what change the result, and
    // callers pass those as resetKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, term, resetKey],
  );

  const pageCount = Math.max(1, Math.ceil(matched.length / pageSize));
  // A filter that shrinks the list can leave the viewer stranded past the last
  // page, which renders as an empty table rather than as "no results".
  const safePage = Math.min(page, pageCount);
  useEffect(() => {
    setPage(1);
  }, [term, resetKey]);

  const start = (safePage - 1) * pageSize;
  return {
    query,
    setQuery,
    rows: matched.slice(start, start + pageSize),
    matched,
    total: list.length,
    page: safePage,
    setPage,
    pageCount,
    from: matched.length === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, matched.length),
    filtered: matched.length !== list.length,
  };
}
