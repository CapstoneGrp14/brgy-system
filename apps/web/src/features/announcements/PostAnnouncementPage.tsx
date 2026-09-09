import { Role } from '@brgy/shared';
import { useState } from 'react';
import {
  useAnnouncements,
  useDeleteAnnouncement,
  usePostAnnouncement,
  useUpdateAnnouncement,
  type AnnouncementView,
} from '../../api/announcements';
import { confirmDialog } from '../../components/ui/ConfirmDialog';
import { FileDropzone } from '../../components/ui/FileDropzone';
import { btnBusy, btnPrimary, card, input, label } from '../../components/ui/kit';
import { fmtDateLong } from '../../components/ui/status';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useT } from '../../i18n';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';

type Mode = 'standard' | 'gmail' | 'urgent';

const MODES: Array<{ id: Mode; labelText: string; hint: string }> = [
  { id: 'standard', labelText: '📢 Standard Banner', hint: 'Shows on resident dashboards and the announcements feed.' },
  { id: 'gmail', labelText: '📧 Banner + Gmail', hint: 'Banner plus an email to every registered resident.' },
  { id: 'urgent', labelText: '🚨 Urgent-Evacuation', hint: 'Red-flagged everywhere, live pop-up alert, bell notification, and email to all residents.' },
];

const modeOf = (a: AnnouncementView): Mode => (a.urgent ? 'urgent' : a.channelEmail ? 'gmail' : 'standard');

/** Announcement composer — identical for employee and admin (FR-9.1/9.2). */
export function PostAnnouncementPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === Role.ADMIN;
  const isMobile = useIsMobile();
  const t = useT();
  const toast = useUiStore((s) => s.toast);
  const { data: feed } = useAnnouncements();
  const post = usePostAnnouncement();
  const update = useUpdateAnnouncement();
  const del = useDeleteAnnouncement();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('standard');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  // Editing an existing post that already has a banner image: keep, replace, or drop it.
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const busy = post.isPending || update.isPending;

  const resetForm = () => {
    setEditingId(null);
    setMode('standard');
    setTitle('');
    setBody('');
    setPhoto(null);
    setExistingPhotoUrl(null);
    setRemovePhoto(false);
  };

  const startEdit = (a: AnnouncementView) => {
    setEditingId(a.id);
    setMode(modeOf(a));
    setTitle(a.title);
    setBody(a.body);
    setPhoto(null);
    setExistingPhotoUrl(a.photoUrl);
    setRemovePhoto(false);
    if (isMobile) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onDelete = async (a: AnnouncementView) => {
    const ok = await confirmDialog({
      title: t('Delete announcement?'),
      message: t('“{title}” will be permanently removed for everyone. This cannot be undone.', { title: a.title }),
      confirmText: t('Delete'),
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await del.mutateAsync(a.id);
      toast(t('🗑️ Announcement deleted.'));
      if (editingId === a.id) resetForm();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Could not delete — try again.'));
    }
  };

  const submit = async () => {
    if (busy) return;
    if (!title.trim() || !body.trim()) return toast(t('Add a title and the announcement text.'));
    const urgent = mode === 'urgent';
    try {
      if (editingId) {
        await update.mutateAsync({
          id: editingId,
          title: title.trim(),
          body: body.trim(),
          banner: true,
          email: mode !== 'standard',
          urgent,
          photo,
          removePhoto: removePhoto && !photo,
        });
        toast(t('✅ Announcement updated.'));
      } else {
        await post.mutateAsync({
          title: title.trim(),
          body: body.trim(),
          banner: true,
          email: mode !== 'standard',
          urgent,
          photo,
        });
        toast(urgent ? t('🚨 Urgent broadcast sent to all residents.') : t('📢 Announcement posted.'));
      }
      resetForm();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? t('Could not post — try again.'));
    }
  };

  const showExistingPhoto = !!existingPhotoUrl && !removePhoto && !photo;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 22, alignItems: 'start' }}>
      <div style={{ ...card, padding: '24px 26px', ...(editingId ? { boxShadow: 'inset 4px 0 0 #F5A81C' } : {}) }}>
        <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>
          {editingId ? t('Edit Announcement') : isAdmin ? t('Broadcast Center') : t('Post Announcement')}
        </h2>
        <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '4px 0 18px' }}>
          {editingId
            ? t('Editing a post updates it for everyone. Residents are not re-emailed or re-notified.')
            : t('Standard banners, Gmail pushes, and urgent-evacuation broadcasts.')}
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              style={{
                flex: isMobile ? '1 1 100%' : 1,
                border: mode === m.id ? '2px solid #1E3A5F' : '1.5px solid #DCE3EE',
                background: mode === m.id ? (m.id === 'urgent' ? '#FEF5F4' : '#F0F5FF') : '#fff',
                borderRadius: 10,
                padding: '10px 12px',
                font: '700 12.5px Poppins, sans-serif',
                color: m.id === 'urgent' ? '#C0392B' : '#1E3A5F',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {t(m.labelText)}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#8A97AB', margin: '0 0 16px' }}>{t(MODES.find((m) => m.id === mode)?.hint ?? '')}</p>

        <label style={label}>{t('Title')}</label>
        <input
          style={{ ...input, marginBottom: 12 }}
          placeholder={t('e.g. Libreng Bakuna sa Barangay Hall — August 2')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label style={label}>{t('Announcement')}</label>
        <textarea
          style={{ ...input, minHeight: 120, resize: 'vertical', fontFamily: 'inherit', marginBottom: 12 }}
          placeholder={t('Details, schedule, requirements…')}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <label style={label}>{t('Dashboard Banner Photo (optional)')}</label>
        {showExistingPhoto ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1.5px solid #DCE3EE', borderRadius: 10 }}>
            <img src={existingPhotoUrl!} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: '#64748B', flex: 1 }}>{t('Current banner photo attached.')}</span>
            <button
              type="button"
              onClick={() => setRemovePhoto(true)}
              style={{ background: 'none', border: 'none', color: '#C0392B', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {t('Remove')}
            </button>
          </div>
        ) : (
          <FileDropzone
            file={photo}
            onFile={(f) => {
              setPhoto(f);
              if (f) setRemovePhoto(false);
            }}
            accept="image/jpeg,image/png,image/webp"
            hint={t('JPG, PNG, or WebP up to 5 MB — shown on resident dashboards and the feed.')}
          />
        )}
        {editingId && removePhoto && !photo && existingPhotoUrl && (
          <button
            type="button"
            onClick={() => setRemovePhoto(false)}
            style={{ background: 'none', border: 'none', color: '#1E3A5F', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', marginTop: 8, padding: 0 }}
          >
            {t('↩ Keep current photo')}
          </button>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <button
            onClick={submit}
            style={
              busy
                ? { ...btnBusy, width: 'auto', padding: '11px 22px' }
                : {
                    ...btnPrimary,
                    width: 'auto',
                    padding: '11px 22px',
                    ...(mode === 'urgent' && !editingId ? { background: '#D64541' } : {}),
                  }
            }
          >
            {busy
              ? editingId
                ? t('Saving…')
                : t('Publishing…')
              : editingId
                ? t('Save Changes')
                : mode === 'urgent'
                  ? t('🚨 Send Urgent Broadcast')
                  : t('Publish Announcement')}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              style={{ background: '#fff', color: '#64748B', border: '1.5px solid #DCE3EE', borderRadius: 9, padding: '11px 20px', font: '700 13px Poppins, sans-serif', cursor: 'pointer' }}
            >
              {t('Cancel')}
            </button>
          )}
        </div>
      </div>

      <div style={{ ...card, padding: '22px 24px' }}>
        <h3 style={{ margin: '0 0 12px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Recent Posts')}</h3>
        {(feed?.items ?? []).length === 0 && <p style={{ fontSize: 13, color: '#8A97AB', margin: 0 }}>{t('Nothing posted yet.')}</p>}
        {(feed?.items ?? []).map((a) => (
          <div
            key={a.id}
            style={{
              padding: '11px 0',
              borderBottom: '1px solid #F0F3F8',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'flex-start',
              ...(editingId === a.id ? { background: '#FFFBF2', margin: '0 -8px', padding: '11px 8px', borderRadius: 8 } : {}),
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: a.urgent ? '#C0392B' : '#2E3A52' }}>
                {a.urgent ? '🚨 ' : '📢 '}
                {a.title}
                {a.photoUrl && ' 🖼️'}
              </div>
              <div style={{ fontSize: 11.5, color: '#8A97AB', marginTop: 3 }}>
                {fmtDateLong(a.createdAt)} · {a.authorLabel} ·{' '}
                {[a.channelBanner && t('Banner'), a.channelEmail && t('Gmail')].filter(Boolean).join(' + ') || t('Feed')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => startEdit(a)}
                title={t('Edit')}
                style={{ background: 'none', border: 'none', color: '#1E3A5F', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', padding: '2px 6px' }}
              >
                {t('Edit')}
              </button>
              <button
                type="button"
                onClick={() => onDelete(a)}
                disabled={del.isPending}
                title={t('Delete')}
                style={{ background: 'none', border: 'none', color: '#C0392B', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', padding: '2px 6px' }}
              >
                {t('Delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
