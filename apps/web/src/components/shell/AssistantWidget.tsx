import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAskAssistant, type AssistantAction } from '../../api/realtime';
import { playChat } from '../../realtime/sounds';
import { useUiStore } from '../../stores/ui';

interface Bubble {
  from: 'bot' | 'me';
  text: string;
  actions?: AssistantAction[];
}

const I18N = {
  en: {
    greeting:
      'Kumusta po! 👋 I am the 591 Assistant. Ask me about documents, bookings, health & medicine, complaints, announcements, verification, or SOS.',
    quick: ['How do I request a document?', 'How do I book the covered court?', 'How do I borrow a nebulizer?'],
    placeholder: 'Type a question…',
    typing: '…typing',
    error: 'Sorry po, I hit a snag — please try again.',
    subtitle: 'Instant answers about barangay services',
  },
  fil: {
    greeting:
      'Kumusta po! 👋 Ako ang 591 Assistant. Magtanong po tungkol sa documents, bookings, health & medicine, complaints, announcements, verification, o SOS.',
    quick: ['Paano humiling ng dokumento?', 'Paano mag-book ng covered court?', 'Paano humiram ng nebulizer?'],
    placeholder: 'Itanong dito…',
    typing: '…nagta-type',
    error: 'Paumanhin po, nagka-problema — pakisubukan ulit.',
    subtitle: 'Mabilis na sagot tungkol sa serbisyo ng barangay',
  },
} as const;

/** Renders the bot's **bold** markers as actual bold text. */
function BotText({ text }: { text: string }) {
  const parts = text.split('**');
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>))}
    </>
  );
}

/** Resident "591 Assistant" chatbot (FR-10.1) — bilingual EN/Filipino, LLM-backed. */
export function AssistantWidget() {
  const language = useUiStore((s) => s.language);
  const navigate = useNavigate();
  const t = I18N[language];
  const [open, setOpen] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState('');
  const ask = useAskAssistant();
  const bottomRef = useRef<HTMLDivElement>(null);
  const shown = bubbles.length ? bubbles : [{ from: 'bot' as const, text: t.greeting }];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [bubbles.length, open]);

  const submit = async (text: string) => {
    const q = text.trim();
    if (!q || ask.isPending) return;
    setDraft('');
    setBubbles((b) => (b.length ? [...b, { from: 'me', text: q }] : [{ from: 'bot', text: t.greeting }, { from: 'me', text: q }]));
    try {
      const res = await ask.mutateAsync({ message: q, language });
      setBubbles((b) => [...b, { from: 'bot', text: res.reply, actions: res.actions }]);
      playChat();
    } catch {
      setBubbles((b) => [...b, { from: 'bot', text: t.error }]);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        title="591 Assistant"
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          width: 54,
          height: 54,
          borderRadius: '50%',
          border: 'none',
          background: '#F4A62A',
          color: '#1E3A5F',
          fontSize: 24,
          cursor: 'pointer',
          boxShadow: '0 8px 22px rgba(244,166,42,.4)',
          zIndex: 65,
        }}
      >
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            right: 18,
            bottom: 82,
            width: 'min(340px, calc(100vw - 36px))',
            height: 'min(460px, calc(100dvh - 140px))',
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
            🤖 591 Assistant
            <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.75 }}>{t.subtitle}</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, background: '#F7F9FC' }}>
            {shown.map((b, i) => (
              <div key={i} style={{ alignSelf: b.from === 'me' ? 'flex-end' : 'flex-start', maxWidth: '86%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div
                  style={{
                    background: b.from === 'me' ? '#1E3A5F' : '#fff',
                    color: b.from === 'me' ? '#fff' : '#2E3A52',
                    border: b.from === 'me' ? 'none' : '1px solid #E3E8F0',
                    borderRadius: b.from === 'me' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                    padding: '9px 12px',
                    fontSize: 13,
                    lineHeight: 1.5,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {b.from === 'bot' ? <BotText text={b.text} /> : b.text}
                </div>
                {/* deep-link buttons: tap → navigate straight to the screen */}
                {b.actions && b.actions.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {b.actions.map((a) => (
                      <button
                        key={a.path}
                        onClick={() => navigate(a.path)}
                        style={{
                          textAlign: 'left',
                          background: '#F0F5FF',
                          border: '1.5px solid #BFD2F0',
                          borderRadius: 9,
                          padding: '8px 12px',
                          font: '700 12.5px Poppins, sans-serif',
                          color: '#2E66D0',
                          cursor: 'pointer',
                        }}
                      >
                        {a.labelText} →
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {ask.isPending && (
              <div style={{ alignSelf: 'flex-start', fontSize: 12.5, color: '#8A97AB' }}>{t.typing}</div>
            )}
            {bubbles.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {t.quick.map((q) => (
                  <button
                    key={q}
                    onClick={() => void submit(q)}
                    style={{ textAlign: 'left', background: '#fff', border: '1.5px solid #DCE3EE', borderRadius: 9, padding: '8px 12px', fontSize: 12.5, color: '#2E66D0', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #EDF0F5' }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submit(draft)}
              placeholder={t.placeholder}
              style={{ flex: 1, border: '1.5px solid #DCE3EE', borderRadius: 9, padding: '10px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
            />
            <button
              onClick={() => void submit(draft)}
              disabled={ask.isPending}
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
