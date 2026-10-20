import type { CSSProperties } from 'react';

/**
 * Shared style tokens lifted from the approved design.
 *
 * Type sizes were raised one step across the board (roughly +1px) after panel
 * feedback: a large share of barangay residents are senior citizens, and the
 * original 11–12.5px labels are hard to read on a phone held at arm's length.
 * Everything scales from these tokens, so the bump stays proportional.
 */

export const card: CSSProperties = {
  background: '#fff',
  border: '1px solid #E8EDF4',
  borderRadius: 14,
  // Two layers: a tight contact shadow plus a wide, very soft ambient one.
  // Reads as depth rather than as a drawn outline, and stays subtle on the
  // light grey page background.
  boxShadow: '0 1px 2px rgba(23,43,77,.04), 0 8px 24px -18px rgba(23,43,77,.28)',
};

export const label: CSSProperties = {
  display: 'block',
  fontSize: 13.5,
  fontWeight: 700,
  color: '#33415E',
  marginBottom: 6,
};

export const input: CSSProperties = {
  width: '100%',
  padding: '11px 13px',
  border: '1.5px solid #E2E8F2',
  borderRadius: 10,
  fontSize: 15,
  // Native inputs don't inherit these — set them so inputs match the 44px
  // Select/DatePicker triggers exactly (side-by-side rows stay level).
  lineHeight: 1.45,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  color: '#2E3A52',
  background: '#fff',
};

export const btnPrimary: CSSProperties = {
  width: '100%',
  padding: '12px 0',
  border: 'none',
  borderRadius: 10,
  boxShadow: '0 1px 2px rgba(30,58,95,.16)',
  background: '#1E3A5F',
  color: '#fff',
  font: '700 15.5px Poppins, sans-serif',
  cursor: 'pointer',
};

export const btnBusy: CSSProperties = {
  ...btnPrimary,
  background: '#5A7396',
  cursor: 'wait',
  animation: 'pulse 1.2s ease infinite',
};

export const errorText: CSSProperties = {
  background: '#FBE4E1',
  color: '#C0392B',
  borderRadius: 9,
  padding: '10px 13px',
  fontSize: 14.5,
  fontWeight: 600,
};

export const successText: CSSProperties = {
  background: '#E4F5EB',
  color: '#1F8B4C',
  borderRadius: 9,
  padding: '10px 13px',
  fontSize: 14.5,
  fontWeight: 600,
};

export function pill(kind: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'gray'): CSSProperties {
  const colors: Record<string, { background: string; color: string }> = {
    blue: { background: '#E3EDFB', color: '#2D6BCF' },
    green: { background: '#E4F5EB', color: '#1F8B4C' },
    yellow: { background: '#FCF3D7', color: '#A17F1A' },
    red: { background: '#FBE4E1', color: '#C0392B' },
    purple: { background: '#EFE7FA', color: '#7A4FC0' },
    orange: { background: '#FDEBD9', color: '#C96A11' },
    gray: { background: '#EEF1F6', color: '#64748B' },
  };
  return {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.4,
    // Filipino labels run longer than the English keys. Wrapping inside the
    // pill keeps it within its cell; nowrap made it overflow into the next one.
    maxWidth: '100%',
    overflowWrap: 'break-word',
    ...colors[kind],
  };
}

/**
 * Shared data-table styles. Use with `tableFixed(minWidth)` + a `<colgroup>`
 * of percentage widths so columns keep the same proportions on every screen
 * instead of auto-sizing to whatever content a page happens to have.
 */
export const th: CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '.06em',
  color: '#7E8CA3',
  borderBottom: '1px solid #E9EDF4',
  // Translated headers are longer; wrap them instead of cutting them off.
  // `break-word` (not `anywhere`) so a header wraps between words rather than
  // splitting a word down the middle.
  lineHeight: 1.3,
  verticalAlign: 'bottom',
  overflowWrap: 'break-word',
};

export const td: CSSProperties = {
  padding: '13px 12px',
  fontSize: 14.5,
  color: '#2E3A52',
  borderBottom: '1px solid #F0F3F8',
  verticalAlign: 'middle',
  overflowWrap: 'break-word',
};

export const tableFixed = (minWidth: number): CSSProperties => ({
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
  minWidth,
});

/** `<colgroup>` helper: cols('28%','16%',…) */
export const cols = (...widths: string[]) =>
  widths.map((width, i) => ({ key: i, style: { width } }));
