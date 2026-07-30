import { useEffect, useRef, useState, type CSSProperties } from 'react';

export interface SelectOption {
  value: string;
  labelText: string;
}

/**
 * Themed dropdown — replaces native <select> so the open menu matches the
 * design system too (native option lists are OS-rendered and unthemable).
 */
export function Select({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  compact = false,
  style,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Smaller paddings for toolbars/headers. */
  compact?: boolean;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

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
          padding: compact ? '8px 12px' : '11px 13px',
          border: `1.5px solid ${open ? '#2E66D0' : '#DFE5EE'}`,
          borderRadius: 9,
          background: '#fff',
          fontSize: compact ? 13 : 14,
          lineHeight: 1.45,
          fontFamily: 'inherit',
          color: selected ? '#2E3A52' : '#9AA6B7',
          cursor: 'pointer',
          textAlign: 'left',
          boxShadow: open ? '0 0 0 3px rgba(46,102,208,.13)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selected?.labelText ?? placeholder}
        </span>
        <svg
          width="12"
          height="8"
          viewBox="0 0 12 8"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
        >
          <path d="M1 1l5 5 5-5" stroke="#64748B" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            minWidth: 160,
            background: '#fff',
            border: '1px solid #E3E8F0',
            borderRadius: 10,
            boxShadow: '0 10px 30px rgba(23,43,77,.14)',
            zIndex: 90,
            maxHeight: 280,
            overflowY: 'auto',
            padding: 5,
            animation: 'fadeIn .14s ease',
          }}
          role="listbox"
        >
          {options.map((o) => {
            const isSelected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = '#F4F7FB';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: compact ? '8px 10px' : '10px 11px',
                  border: 'none',
                  borderRadius: 7,
                  background: isSelected ? '#EAF1FC' : 'transparent',
                  color: isSelected ? '#21409A' : '#2E3A52',
                  fontSize: compact ? 13 : 13.5,
                  fontWeight: isSelected ? 700 : 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {o.labelText}
                </span>
                {isSelected && <span style={{ color: '#F5A81C', flexShrink: 0 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
