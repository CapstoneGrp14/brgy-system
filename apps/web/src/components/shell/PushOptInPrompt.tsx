import { useEffect, useState } from 'react';
import { enablePush, pushState } from '../../api/push';
import { Modal } from '../ui/Modal';
import { useT } from '../../i18n';
import { useUiStore } from '../../stores/ui';

/** Set once the resident answers either way, so the ask never nags. */
const DISMISS_KEY = 'brgy591.pushPromptDismissed';

/**
 * Asks for notification permission once, as soon as a resident is in the
 * portal — which in practice means straight after login.
 *
 * The opt-in used to live only on the Announcements page, so a resident had to
 * go looking for a control they did not know existed; nobody ever subscribed
 * and urgent advisories never left the portal. A banner replaced that and was
 * still easy to scroll past, so the ask is now a modal: an evacuation notice
 * is worth one interruption, and only one.
 *
 * It is still a button rather than an automatic `requestPermission()` call,
 * deliberately:
 *   - Firefox and Safari ignore requestPermission() without a user gesture, and
 *     the login click's activation has expired by the time the portal mounts.
 *   - Chrome allows it, but shows its "quiet" UI to sites whose prompts get
 *     dismissed, and a site that burns that reputation cannot ask again.
 * Explaining first and asking on a click is what keeps the prompt grantable.
 *
 * Any answer — including closing the modal — is remembered per browser. The
 * Announcements card stays as the permanent control for anyone who says no
 * and later changes their mind.
 */
export function PushOptInPrompt() {
  const t = useT();
  const toast = useUiStore((s) => s.toast);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    // 'default' is the only undecided state: 'granted' and 'denied' are already
    // answered, and the unavailable states are explained on the Announcements
    // page rather than interrupting anyone here.
    void pushState().then((s) => setShow(s === 'default'));
  }, []);

  if (!show) return null;

  const close = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  };

  const accept = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await enablePush();
      if (next === 'granted') toast(t('🔔 Urgent alerts on — we will notify this device.'));
      else if (next === 'denied') toast(t('Notifications are blocked in your browser settings.'));
    } catch {
      toast(t('Could not turn on notifications.'));
    } finally {
      close();
      setBusy(false);
    }
  };

  return (
    <Modal title={t('Turn on urgent barangay alerts?')} onClose={close} width={460}>
      <p style={{ fontSize: 13.5, color: '#2E3A52', lineHeight: 1.65, margin: '0 0 8px' }}>
        {t('Barangay 591 can alert this device about evacuation notices and emergency advisories — even when the portal is closed.')}
      </p>
      <p style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.6, margin: '0 0 18px' }}>
        {t('Your browser will ask you to Allow. Only urgent announcements are sent this way — never routine notices.')}
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={close}
          style={{
            background: '#fff',
            color: '#33415E',
            border: '1.5px solid #DFE5EE',
            borderRadius: 9,
            padding: '10px 16px',
            font: '700 12.5px Poppins, sans-serif',
            cursor: 'pointer',
          }}
        >
          {t('Not now')}
        </button>
        <button
          onClick={() => void accept()}
          disabled={busy}
          style={{
            background: '#1E3A5F',
            color: '#fff',
            border: 'none',
            borderRadius: 9,
            padding: '10px 18px',
            font: '700 12.5px Poppins, sans-serif',
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {busy ? t('Working…') : t('Enable alerts')}
        </button>
      </div>
    </Modal>
  );
}
