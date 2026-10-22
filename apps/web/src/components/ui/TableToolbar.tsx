import type { CSSProperties, ReactNode } from 'react';
import { input } from './kit';
import { useT } from '../../i18n';
import type { TableView } from '../../hooks/useTableView';

const wrap: CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  alignItems: 'center',
  marginBottom: 14,
};

/**
 * Search box plus a slot for filter dropdowns, sized to sit in a card header.
 *
 * The count line lives here rather than in each page because the distinction
 * that matters — "3 of 48" versus "48" — is easy to leave out when it is
 * written by hand on every screen, and without it a narrowed table reads as
 * though the records have gone missing.
 */
export function TableToolbar<T>({
  view,
  placeholder,
  children,
  searchWidth = 220,
  style,
}: {
  view: TableView<T>;
  placeholder: string;
  /** Filter controls — rendered to the right of the search box. */
  children?: ReactNode;
  searchWidth?: number;
  style?: CSSProperties;
}) {
  const t = useT();
  return (
    <div style={{ ...wrap, ...style }}>
      <input
        value={view.query}
        onChange={(e) => view.setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{ ...input, width: searchWidth, marginBottom: 0, flex: '1 1 180px', maxWidth: searchWidth }}
      />
      {children}
      <span style={{ fontSize: 12, color: '#8A97AB', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
        {view.filtered
          ? t('{n} of {total}', { n: view.matched.length, total: view.total })
          : t(view.total === 1 ? '{n} record' : '{n} records', { n: view.total })}
      </span>
    </div>
  );
}

const pageBtn = (disabled: boolean): CSSProperties => ({
  background: '#fff',
  color: disabled ? '#B6C0CE' : '#33415E',
  border: '1.5px solid #DFE5EE',
  borderRadius: 8,
  padding: '7px 13px',
  font: '700 12.5px Poppins, sans-serif',
  cursor: disabled ? 'not-allowed' : 'pointer',
});

/**
 * Prev/next pager. Hidden when everything fits on one page — a dead control
 * under a four-row table is noise, not reassurance.
 */
export function Pagination<T>({ view }: { view: TableView<T> }) {
  const t = useT();
  if (view.pageCount <= 1) return null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        flexWrap: 'wrap',
        marginTop: 14,
        paddingTop: 12,
        borderTop: '1px solid #F0F3F8',
      }}
    >
      <span style={{ fontSize: 12.5, color: '#8A97AB' }}>
        {t('Showing {from}–{to} of {n}', { from: view.from, to: view.to, n: view.matched.length })}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => view.setPage(view.page - 1)}
          disabled={view.page <= 1}
          style={pageBtn(view.page <= 1)}
        >
          {t('Previous')}
        </button>
        <span style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600, minWidth: 74, textAlign: 'center' }}>
          {t('Page {page} of {pageCount}', { page: view.page, pageCount: view.pageCount })}
        </span>
        <button
          onClick={() => view.setPage(view.page + 1)}
          disabled={view.page >= view.pageCount}
          style={pageBtn(view.page >= view.pageCount)}
        >
          {t('Next')}
        </button>
      </div>
    </div>
  );
}
