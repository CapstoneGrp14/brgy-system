import { BARANGAY_ORDINANCES } from '@brgy/shared';
import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useT } from '../../i18n';

/**
 * "What can the barangay act on?" — an info control beside the complaint form.
 *
 * Residents regularly file matters the barangay has no authority over and only
 * find out after waiting on a mediation clock. Listing the ordinances up front,
 * on demand rather than as another wall of warning text, lets someone check
 * before they type without pushing the form itself down the page.
 */
export function OrdinanceGuide() {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('What can the barangay act on?')}
        title={t('What can the barangay act on?')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          padding: 0,
          marginLeft: 8,
          color: '#2E66D0',
          font: '700 12.5px Poppins, sans-serif',
          cursor: 'pointer',
          verticalAlign: 'middle',
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-grid',
            placeItems: 'center',
            width: 17,
            height: 17,
            borderRadius: '50%',
            border: '1.5px solid currentColor',
            font: '700 11px Poppins, sans-serif',
            lineHeight: 1,
          }}
        >
          i
        </span>
        {t('What we can act on')}
      </button>

      {open && (
        <Modal title={t('What the barangay can act on')} onClose={() => setOpen(false)} width={620}>
          <p style={{ margin: '0 0 18px', fontSize: 13.5, color: '#5A6A80', lineHeight: 1.6 }}>
            {t('These are the city ordinances the barangay enforces directly. Neighbour disputes also go through Katarungang Pambarangay mediation even when no ordinance below applies.')}
          </p>

          {BARANGAY_ORDINANCES.map((group) => (
            <div key={group.labelText} style={{ marginBottom: 18 }}>
              <h4 style={{ margin: '0 0 8px', font: '700 13.5px Poppins, sans-serif', color: '#1E3A5F' }}>
                {t(group.labelText)}
              </h4>
              {group.items.map((o) => (
                <div
                  key={o.reference}
                  style={{
                    borderLeft: '2px solid #E3E8F0',
                    padding: '2px 0 2px 12px',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#2E3A52' }}>{o.reference}</div>
                  <div style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.55, marginTop: 2 }}>
                    {t(o.covers)}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* The point of the whole dialog — stated plainly at the end. */}
          <div
            style={{
              background: '#FFF6E5',
              border: '1px solid #F0DCB4',
              borderRadius: 9,
              padding: '12px 14px',
              fontSize: 12.5,
              lineHeight: 1.6,
              color: '#8A5B10',
            }}
          >
            {t('Anything outside these — theft, physical injury, serious crimes, or disputes with people living in another city — is beyond barangay authority. Report those to the Philippine National Police, or call 911 if anyone is in danger.')}
          </div>
        </Modal>
      )}
    </>
  );
}
