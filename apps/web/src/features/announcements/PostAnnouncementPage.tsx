import { Role } from '@brgy/shared';
import { useState } from 'react';
import { useAnnouncements, usePostAnnouncement } from '../../api/announcements';
import { FileDropzone } from '../../components/ui/FileDropzone';
import { btnBusy, btnPrimary, card, input, label } from '../../components/ui/kit';
import { fmtDateLong } from '../../components/ui/status';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';

type Mode = 'standard' | 'gmail' | 'urgent';

const MODES: Array<{ id: Mode; labelText: string; hint: string }> = [
  { id: 'standard', labelText: '📢 Standard Banner', hint: 'Shows on resident dashboards and the announcements feed.' },
  { id: 'gmail', labelText: '📧 Banner + Gmail', hint: 'Banner plus an email to every registered resident.' },
  { id: 'urgent', labelText: '🚨 Urgent-Evacuation', hint: 'Red-flagged everywhere, live pop-up alert, bell notification, and email to all residents.' },
];

/** Announcement composer — identical for employee and admin (FR-9.1/9.2). */
export function PostAnnouncementPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === Role.ADMIN;
  const isMobile = useIsMobile();
  const toast = useUiStore((s) => s.toast);
  const { data: feed } = useAnnouncements();
  const post = usePostAnnouncement();

  const [mode, setMode] = useState<Mode>('standard');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);

  const submit = async () => {
    if (post.isPending) return;
    if (!title.trim() || !body.trim()) return toast('Add a title and the announcement text.');
    const urgent = mode === 'urgent';
    try {
      await post.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        banner: true,
        email: mode !== 'standard',
        urgent,
        photo,
      });
      toast(urgent ? '🚨 Urgent broadcast sent to all residents.' : '📢 Announcement posted.');
      setTitle('');
      setBody('');
      setPhoto(null);
    } catch (err: any) {
      toast(err?.response?.data?.message ?? 'Could not post — try again.');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 22, alignItems: 'start' }}>
      <div style={{ ...card, padding: '24px 26px' }}>
        <h2 style={{ margin: 0, font: '700 16px Poppins, sans-serif', color: '#1E3A5F' }}>
          {isAdmin ? 'Broadcast Center' : 'Post Announcement'}
        </h2>
        <p style={{ fontSize: 12.5, color: '#8A97AB', margin: '4px 0 18px' }}>
          Standard banners, Gmail pushes, and urgent-evacuation broadcasts.
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
              {m.labelText}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#8A97AB', margin: '0 0 16px' }}>{MODES.find((m) => m.id === mode)?.hint}</p>

        <label style={label}>Title</label>
        <input
          style={{ ...input, marginBottom: 12 }}
          placeholder="e.g. Libreng Bakuna sa Barangay Hall — August 2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label style={label}>Announcement</label>
        <textarea
          style={{ ...input, minHeight: 120, resize: 'vertical', fontFamily: 'inherit', marginBottom: 12 }}
          placeholder="Details, schedule, requirements…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <label style={label}>Dashboard Banner Photo (optional)</label>
        <FileDropzone
          file={photo}
          onFile={setPhoto}
          accept="image/jpeg,image/png,image/webp"
          hint="JPG, PNG, or WebP up to 5 MB — shown on resident dashboards and the feed."
        />

        <button
          onClick={submit}
          style={
            post.isPending
              ? { ...btnBusy, width: 'auto', padding: '11px 22px', marginTop: 14 }
              : {
                  ...btnPrimary,
                  width: 'auto',
                  padding: '11px 22px',
                  marginTop: 14,
                  ...(mode === 'urgent' ? { background: '#D64541' } : {}),
                }
          }
        >
          {post.isPending ? 'Publishing…' : mode === 'urgent' ? '🚨 Send Urgent Broadcast' : 'Publish Announcement'}
        </button>
      </div>

      <div style={{ ...card, padding: '22px 24px' }}>
        <h3 style={{ margin: '0 0 12px', font: '700 15px Poppins, sans-serif', color: '#1E3A5F' }}>Recent Posts</h3>
        {(feed?.items ?? []).length === 0 && <p style={{ fontSize: 13, color: '#8A97AB', margin: 0 }}>Nothing posted yet.</p>}
        {(feed?.items ?? []).map((a) => (
          <div key={a.id} style={{ padding: '11px 0', borderBottom: '1px solid #F0F3F8' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: a.urgent ? '#C0392B' : '#2E3A52' }}>
              {a.urgent ? '🚨 ' : '📢 '}
              {a.title}
              {a.photoUrl && ' 🖼️'}
            </div>
            <div style={{ fontSize: 11.5, color: '#8A97AB', marginTop: 3 }}>
              {fmtDateLong(a.createdAt)} · {a.authorLabel} ·{' '}
              {[a.channelBanner && 'Banner', a.channelEmail && 'Gmail'].filter(Boolean).join(' + ') || 'Feed'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
