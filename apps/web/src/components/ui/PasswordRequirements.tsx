import type { CSSProperties } from 'react';
import { PASSWORD_RULES } from '@brgy/shared';
import { useT } from '../../i18n';

/**
 * Live checklist under a new-password field. The rules are visible from the
 * start and tick over as the resident types, rather than surfacing only after
 * a rejected submit — these are the same rules `@brgy/shared` enforces on the
 * API, so nothing here can drift from what the server will accept.
 *
 * `touched` keeps the list neutral until typing begins: an untouched field
 * shouldn't look like three failures.
 */
export function PasswordRequirements({
  password,
  style,
}: {
  password: string;
  style?: CSSProperties;
}) {
  const t = useT();
  const touched = password.length > 0;

  return (
    <ul
      style={{
        listStyle: 'none',
        margin: '0 0 12px',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        ...style,
      }}
    >
      {PASSWORD_RULES.map((rule) => {
        const met = rule.isMet(password);
        return (
          <li
            key={rule.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 7,
              fontSize: 12,
              lineHeight: 1.45,
              fontWeight: 600,
              color: !touched ? '#8A97AB' : met ? '#1F8B4C' : '#C0392B',
            }}
          >
            <span aria-hidden="true" style={{ flexShrink: 0, width: 12 }}>
              {!touched ? '•' : met ? '✓' : '✕'}
            </span>
            <span style={{ minWidth: 0 }}>{t(rule.label)}</span>
          </li>
        );
      })}
    </ul>
  );
}
