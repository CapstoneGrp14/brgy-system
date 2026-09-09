import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import { input } from './kit';

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
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          padding: 6,
          color: '#64748B',
        }}
      >
        {visible ? '🙈' : '👁️'}
      </button>
    </div>
  );
}
