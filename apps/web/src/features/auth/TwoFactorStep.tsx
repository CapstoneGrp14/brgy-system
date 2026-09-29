import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { TWO_FACTOR_CODE_LENGTH, type LoginResponse, type TwoFactorChallenge } from '@brgy/shared';
import { resendTwoFactorCode, verifyTwoFactor } from '../../api/auth';
import { btnBusy, btnPrimary, errorText, successText } from '../../components/ui/kit';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';

const EMPTY = Array.from({ length: TWO_FACTOR_CODE_LENGTH }, () => '');

const mmss = (total: number) =>
  `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;

/**
 * Second sign-in step: the 6-digit code emailed by /auth/login. One box per
 * digit with auto-advance and paste support, plus the two countdowns the
 * server enforces (code expiry and the resend cooldown).
 */
export function TwoFactorStep({
  challenge,
  onChallengeRefreshed,
  onVerified,
  onCancel,
}: {
  challenge: TwoFactorChallenge;
  onChallengeRefreshed: (next: TwoFactorChallenge) => void;
  onVerified: (session: LoginResponse) => void;
  /** Back to the password form; `reason` is shown there when the challenge died. */
  onCancel: (reason?: string) => void;
}) {
  const t = useT();
  const isMobile = useIsMobile();
  const [digits, setDigits] = useState<string[]>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [expiresIn, setExpiresIn] = useState(challenge.expiresInSeconds);
  const [resendIn, setResendIn] = useState(challenge.resendAfterSeconds);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const code = digits.join('');
  const complete = code.length === TWO_FACTOR_CODE_LENGTH;

  // A resend hands back a brand-new challenge — clear the boxes and restart
  // both countdowns against it.
  useEffect(() => {
    setDigits(EMPTY);
    setError('');
    setExpiresIn(challenge.expiresInSeconds);
    setResendIn(challenge.resendAfterSeconds);
    boxes.current[0]?.focus();
  }, [challenge.challengeId, challenge.expiresInSeconds, challenge.resendAfterSeconds]);

  useEffect(() => {
    const tick = setInterval(() => {
      setExpiresIn((s) => (s > 0 ? s - 1 : 0));
      setResendIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const expired = expiresIn === 0;

  const submit = async (value = code) => {
    if (busy || value.length !== TWO_FACTOR_CODE_LENGTH) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const session = await verifyTwoFactor(challenge.challengeId, value);
      onVerified(session);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const text = Array.isArray(msg) ? msg[0] : (msg ?? t('We could not verify that code — please try again.'));
      // Expired, locked out, too many codes — the challenge is gone server-side,
      // so hand the reason back to the sign-in form instead of stalling here.
      if (err?.response?.data?.restart) {
        onCancel(text);
        return;
      }
      setError(text);
      setDigits(EMPTY);
      boxes.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resending || resendIn > 0) return;
    setError('');
    setNotice('');
    setResending(true);
    try {
      const next = await resendTwoFactorCode(challenge.challengeId);
      onChallengeRefreshed(next);
      setNotice(t('📧 A new code is on its way — the previous one no longer works.'));
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      const text = Array.isArray(msg) ? msg[0] : (msg ?? t('Could not send another code — please sign in again.'));
      if (err?.response?.data?.restart) {
        onCancel(text);
        return;
      }
      setError(text);
    } finally {
      setResending(false);
    }
  };

  const setDigit = (index: number, raw: string) => {
    const typed = raw.replace(/\D/g, '');
    if (!typed) {
      setDigits((d) => d.map((v, i) => (i === index ? '' : v)));
      return;
    }
    // Typing (or autofilling) several digits at once spills into the boxes
    // that follow instead of being truncated to one.
    const next = [...digits];
    for (let i = 0; i < typed.length && index + i < TWO_FACTOR_CODE_LENGTH; i++) {
      next[index + i] = typed[i];
    }
    setDigits(next);
    const landed = Math.min(index + typed.length, TWO_FACTOR_CODE_LENGTH - 1);
    boxes.current[landed]?.focus();
    const joined = next.join('');
    if (joined.length === TWO_FACTOR_CODE_LENGTH) void submit(joined);
  };

  const onKey = (index: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      e.preventDefault();
      setDigits((d) => d.map((v, i) => (i === index - 1 ? '' : v)));
      boxes.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) boxes.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < TWO_FACTOR_CODE_LENGTH - 1) boxes.current[index + 1]?.focus();
    if (e.key === 'Enter') void submit();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();
    setDigit(0, pasted.slice(0, TWO_FACTOR_CODE_LENGTH));
  };

  const boxStyle = useMemo(
    () => ({
      width: '100%',
      minWidth: 0,
      // Square-ish boxes that shrink with the grid instead of overflowing on
      // narrow phones.
      aspectRatio: '1 / 1.18',
      textAlign: 'center' as const,
      font: `700 ${isMobile ? 20 : 22}px Poppins, sans-serif`,
      color: '#1E3A5F',
      border: '1.5px solid #DFE5EE',
      borderRadius: 10,
      background: expired ? '#F7F8FB' : '#fff',
      boxSizing: 'border-box' as const,
      padding: 0,
    }),
    [isMobile, expired],
  );

  return (
    <div>
      <h1 style={{ margin: 0, font: '700 22px Poppins, sans-serif', color: '#1E3A5F' }}>
        {t('Check your email')}
      </h1>
      <p style={{ margin: '6px 0 18px', fontSize: 13.5, color: '#64748B', lineHeight: 1.6 }}>
        {t('For your security we emailed a {n}-digit code to', { n: TWO_FACTOR_CODE_LENGTH })}{' '}
        <strong style={{ color: '#1E3A5F', wordBreak: 'break-all' }}>{challenge.maskedEmail}</strong>.{' '}
        {t('Enter it below to finish signing in.')}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${TWO_FACTOR_CODE_LENGTH}, minmax(0, 1fr))`,
          gap: isMobile ? 7 : 9,
          marginBottom: 14,
        }}
      >
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            value={digit}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={onKey(i)}
            onPaste={onPaste}
            onFocus={(e) => e.currentTarget.select()}
            disabled={expired || busy}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={t('Digit {n}', { n: i + 1 })}
            maxLength={TWO_FACTOR_CODE_LENGTH}
            style={boxStyle}
          />
        ))}
      </div>

      <div style={{ fontSize: 12.5, color: expired ? '#C0392B' : '#8A97AB', fontWeight: 600, marginBottom: 14 }}>
        {expired
          ? t('⏱️ This code has expired — sign in again to get a new one.')
          : t('⏱️ Code expires in {time}', { time: mmss(expiresIn) })}
      </div>

      {error && <div style={{ ...errorText, marginBottom: 12 }}>{error}</div>}
      {notice && !error && <div style={{ ...successText, marginBottom: 12 }}>{notice}</div>}

      <button onClick={() => submit()} style={busy || !complete || expired ? btnBusy : btnPrimary} disabled={!complete || expired}>
        {busy ? t('Verifying…') : t('Verify & Sign In')}
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
        <button
          type="button"
          onClick={resend}
          disabled={resendIn > 0 || resending}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            font: 'inherit',
            fontSize: 13,
            fontWeight: 700,
            color: resendIn > 0 || resending ? '#9AA6B7' : '#2E66D0',
            cursor: resendIn > 0 || resending ? 'default' : 'pointer',
          }}
        >
          {resending
            ? t('Sending…')
            : resendIn > 0
              ? t('Resend code in {s}s', { s: resendIn })
              : t('Resend code')}
        </button>
        <button
          type="button"
          onClick={() => onCancel()}
          style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', fontSize: 13, fontWeight: 700, color: '#64748B', cursor: 'pointer' }}
        >
          {t('← Use a different account')}
        </button>
      </div>

      <p style={{ fontSize: 12, color: '#8A97AB', marginTop: 16, marginBottom: 0, lineHeight: 1.6 }}>
        {t("Didn't get it? Check your spam folder — the code comes from the Barangay 591 e-Services Portal.")}
      </p>
    </div>
  );
}
