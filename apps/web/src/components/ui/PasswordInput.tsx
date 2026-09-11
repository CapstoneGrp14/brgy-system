import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { input } from './kit';

/**
 * Eye / eye-off drawn as inline SVG rather than the 👁️🙈 emoji: emoji glyphs are
 * supplied by the OS font, so they rendered in a different style (or as a flat
 * outline) depending on the browser and platform.
 */
const EyeIcon = ({ off }: { off: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    {off ? (
      <>
        <path d="M8.4 4.9A7.8 7.8 0 0 1 10 4.7c5.4 0 8.3 5.3 8.3 5.3a14.2 14.2 0 0 1-2.4 3.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M4.4 6.2A13.9 13.9 0 0 0 1.7 10s2.9 5.3 8.3 5.3c1.4 0 2.7-.35 3.8-.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8.4 8.4a2.3 2.3 0 0 0 3.2 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M3 3l14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ) : (
      <>
        <path d="M1.7 10S4.6 4.7 10 4.7s8.3 5.3 8.3 5.3-2.9 5.3-8.3 5.3S1.7 10 1.7 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      </>
    )}
  </svg>
);

/**
 * Password field with a show/hide eye toggle. Drop-in replacement for a
 * `<input type="password">` — keeps the shared input styling and reserves room
 * on the right for the reveal button.
 */
export function PasswordInput({
  value,
  onChange,
  placeholder,
  onKeyDown,
  autoComplete,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  style?: CSSProperties;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative', ...style }}>
      <input
        style={{ ...input, paddingRight: 44 }}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        title={visible ? 'Hide password' : 'Show password'}
        aria-label={visible ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute',
          right: 6,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          lineHeight: 0,
          padding: 6,
          color: '#64748B',
        }}
      >
        <EyeIcon off={visible} />
      </button>
    </div>
  );
}
