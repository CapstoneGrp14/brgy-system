import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useT } from '../../i18n';
import { Select } from './Select';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad = (n: number) => String(n).padStart(2, '0');
const toDateString = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Today in the browser's own timezone, as YYYY-MM-DD. Pass to `maxDate` to
 *  bar future dates (birthdates, "date filed", etc.). */
export function todayString(): string {
  const d = new Date();
  return toDateString(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseValue(value: string): { date: string; time: string } {
  if (!value) return { date: '', time: '' };
  const [date, time = ''] = value.split('T');
  return { date, time: time.slice(0, 5) };
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { value: `${pad(h)}:${m}`, labelText: `${h12}:${m} ${h < 12 ? 'AM' : 'PM'}` };
});

/**
 * Themed calendar picker — replaces native date / datetime-local inputs.
 * Value format: YYYY-MM-DD, or YYYY-MM-DDTHH:mm when withTime.
 */
export function DatePicker({
  value,
  onChange,
  withTime = false,
  placeholder,
  minYear = 1900,
  maxYear = new Date().getFullYear() + 2,
  maxDate,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  withTime?: boolean;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
  /** Latest selectable day (YYYY-MM-DD). Later days render disabled. */
  maxDate?: string;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { date, time } = parseValue(value);
  const t = useT();

  const today = new Date();
  const maxTs = maxDate ? new Date(maxDate + 'T00:00').getTime() : null;
  const maxD = maxDate ? new Date(maxDate + 'T00:00') : null;
  const effMaxYear = maxD ? Math.min(maxYear, maxD.getFullYear()) : maxYear;
  const selected = date ? new Date(date + 'T00:00') : null;
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const emit = (nextDate: string, nextTime: string) => {
    if (!nextDate) return onChange('');
    onChange(withTime ? `${nextDate}T${nextTime || '08:00'}` : nextDate);
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    if (next.getFullYear() < minYear || next.getFullYear() > effMaxYear) return;
    // Don't page into a month that lies entirely beyond maxDate.
    if (maxD && next > new Date(maxD.getFullYear(), maxD.getMonth(), 1)) return;
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const displayText = (() => {
    if (!date) return placeholder ?? (withTime ? t('Pick date & time…') : t('Pick a date…'));
    const base = new Date(date + 'T00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (!withTime || !time) return base;
    const timeLabel = TIME_OPTIONS.find((o) => o.value === time)?.labelText ?? time;
    return `${base} · ${timeLabel}`;
  })();

  const navBtn: CSSProperties = {
    width: 28,
    height: 28,
    border: '1px solid #DFE5EE',
    borderRadius: 7,
    background: '#fff',
    color: '#33415E',
    fontWeight: 700,
    cursor: 'pointer',
  };

  const years = Array.from({ length: effMaxYear - minYear + 1 }, (_, i) => effMaxYear - i);

  return (
    <div ref={rootRef} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '11px 13px',
          border: `1.5px solid ${open ? '#2E66D0' : '#DFE5EE'}`,
          borderRadius: 9,
          background: '#fff',
          fontSize: 14,
          lineHeight: 1.45,
          fontFamily: 'inherit',
          color: date ? '#2E3A52' : '#9AA6B7',
          cursor: 'pointer',
          textAlign: 'left',
          boxShadow: open ? '0 0 0 3px rgba(46,102,208,.13)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayText}</span>
        {/* SVG (not emoji) so the trigger height matches the Select chevron exactly. */}
        <svg width="15" height="15" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
          <rect x="1.5" y="2.5" width="13" height="12" rx="2" fill="none" stroke="#64748B" strokeWidth="1.6" />
          <path d="M1.5 6h13" stroke="#64748B" strokeWidth="1.6" />
          <path d="M5 1v3M11 1v3" stroke="#64748B" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: 292,
            background: '#fff',
            border: '1px solid #E3E8F0',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(23,43,77,.14)',
            zIndex: 95,
            padding: 14,
            animation: 'fadeIn .14s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <button type="button" onClick={() => shiftMonth(-1)} style={navBtn}>‹</button>
            <Select
              compact
              value={String(viewMonth)}
              onChange={(v) => setViewMonth(Number(v))}
              options={MONTHS.map((m, i) => ({ value: String(i), labelText: t(m) }))}
              style={{ flex: 1 }}
            />
            <Select
              compact
              value={String(viewYear)}
              onChange={(v) => setViewYear(Number(v))}
              options={years.map((y) => ({ value: String(y), labelText: String(y) }))}
              style={{ width: 86 }}
            />
            <button type="button" onClick={() => shiftMonth(1)} style={navBtn}>›</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {WEEKDAYS.map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#7E8CA3', padding: '4px 0' }}>
                {t(d)}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={`x${i}`} />;
              const cellDate = toDateString(viewYear, viewMonth, day);
              const isSelected = cellDate === date;
              const isToday = cellDate === toDateString(today.getFullYear(), today.getMonth(), today.getDate());
              const isBlocked = maxTs !== null && new Date(cellDate + 'T00:00').getTime() > maxTs;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isBlocked}
                  onClick={() => {
                    if (isBlocked) return;
                    emit(cellDate, time);
                    if (!withTime) setOpen(false);
                  }}
                  style={{
                    height: 32,
                    border: isToday && !isSelected && !isBlocked ? '1.5px solid #F5A81C' : 'none',
                    borderRadius: 8,
                    background: isSelected ? '#1E3A5F' : 'transparent',
                    color: isBlocked ? '#C8D0DC' : isSelected ? '#fff' : '#2E3A52',
                    fontSize: 13,
                    fontWeight: isSelected || isToday ? 700 : 500,
                    cursor: isBlocked ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isBlocked) (e.currentTarget as HTMLButtonElement).style.background = '#EAF1FC';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {withTime && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#33415E', flexShrink: 0 }}>{t('🕐 Time')}</span>
              <Select
                compact
                value={time}
                onChange={(t) => {
                  emit(date || toDateString(today.getFullYear(), today.getMonth(), today.getDate()), t);
                }}
                options={TIME_OPTIONS}
                placeholder={t('Pick time…')}
                style={{ flex: 1 }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
