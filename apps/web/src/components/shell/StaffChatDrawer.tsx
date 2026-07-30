import { useEffect, useRef, useState } from 'react';
import { useChatHistory, useSendChat } from '../../api/realtime';
import { useAuthStore } from '../../stores/auth';
import { useUiStore } from '../../stores/ui';

/** Internal staff chat (FR-10.2): floating button + drawer, live over the socket. */
export function StaffChatDrawer() {
  const user = useAuthStore((s) => s.user);
  const open = useUiStore((s) => s.chatOpen);
  const unread = useUiStore((s) => s.chatUnread);
  const toggle = useUiStore((s) => s.toggleChat);
  const { data: messages } = useChatHistory();
  const send = useSendChat();
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length, open]);

  const submit = async () => {
    const body = draft.trim();
    if (!body || send.isPending) return;
    setDraft('');
    try {
      await send.mutateAsync(body);
    } catch {
      setDraft(body);
    }
  };

  return (
    <>
      <button
        onClick={toggle}
        title="Staff Chat"
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          width: 54,
          height: 54,
          borderRadius: '50%',
          border: 'none',
          background: '#1E3A5F',
          color: '#fff',
          fontSize: 22,
          cursor: 'pointer',
          boxShadow: '0 8px 22px rgba(23,43,77,.35)',
          zIndex: 65,
        }}
      >
        {open ? '✕' : '💬'}
        {!open && unread > 0 && (
          <span style={{ position: 'absolute', top: -2, right: -2, background: '#D64541', color: '#fff', borderRadius: 999, minWidth: 20, height: 20, fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center', padding: '0 5px' }}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            right: 18,
            bottom: 82,
            width: 'min(340px, calc(100vw - 36px))',
            height: 'min(440px, calc(100dvh - 140px))',
            background: '#fff',
            border: '1px solid #E3E8F0',
            borderRadius: 14,
            boxShadow: '0 14px 40px rgba(23,43,77,.2)',
            zIndex: 65,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ background: '#1E3A5F', color: '#fff', padding: '12px 16px', font: '700 14px Poppins, sans-serif' }}>
            💬 Staff Chat
            <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.75 }}>Internal channel — employees & admin</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, background: '#F7F9FC' }}>
            {(messages ?? []).length === 0 && (
              <div style={{ fontSize: 12.5, color: '#8A97AB', textAlign: 'center', marginTop: 20 }}>
                No messages yet — say hi to the team 👋
              </div>
            )}
            {(messages ?? []).map((m) => {
              const mine = m.senderId === user?.id;
              return (
                <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
                  {!mine && (
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: '#7E8CA3', margin: '0 0 2px 4px' }}>
                      {m.senderName}
                    </div>
                  )}
                  <div
                    style={{
                      background: mine ? '#1E3A5F' : '#fff',
                      color: mine ? '#fff' : '#2E3A52',
                      border: mine ? 'none' : '1px solid #E3E8F0',
                      borderRadius: mine ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                      padding: '8px 12px',
                      fontSize: 13,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {m.body}
                  </div>
                  <div style={{ fontSize: 10, color: '#9AA6B7', margin: mine ? '2px 4px 0 0' : '2px 0 0 4px', textAlign: mine ? 'right' : 'left' }}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #EDF0F5' }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              placeholder="Message the team…"
              style={{ flex: 1, border: '1.5px solid #DCE3EE', borderRadius: 9, padding: '10px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
            />
            <button
              onClick={() => void submit()}
              disabled={send.isPending}
              style={{ background: '#F4A62A', border: 'none', borderRadius: 9, padding: '0 16px', font: '700 13px Poppins, sans-serif', color: '#1E3A5F', cursor: 'pointer' }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
