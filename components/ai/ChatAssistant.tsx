'use client';
import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Loader2 } from 'lucide-react';
import type { GroundingContext } from '@/lib/types';

interface Message { role: 'user' | 'assistant'; content: string; }

interface Props { context: GroundingContext; onClose: () => void; }

const STARTERS = [
  'Which department has the highest automation ROI?',
  'What are the top 3 tasks to automate first?',
  'How much cost can we recover from Email Triage?',
  'Show weekly repetitive work trend insights',
];

export default function ChatAssistant({ context, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, context }),
      });
      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => 'Stream failed');
        throw new Error(errText);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = '';

      setMessages(m => [...m, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages(m => {
          const updated = [...m];
          updated[updated.length - 1] = { role: 'assistant', content: reply };
          return updated;
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setMessages(m => [...m, { role: 'assistant', content: `⚠ ${msg.includes('GROQ') ? msg : 'Could not reach AI. Check your GROQ_API_KEY in .env.local — get a free key at console.groq.com'}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="chat-panel">
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={16} color="white" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14 }}>Workforce Pluse AI</p>
              <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>Grounded on your data</p>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: 6 }}>
            <X size={15} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>Try asking:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {STARTERS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                      textAlign: 'left', fontSize: 12, color: 'var(--text-muted)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.target as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                    onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.target as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-card)',
                border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                fontSize: 13,
                lineHeight: 1.6,
                color: m.role === 'user' ? 'white' : 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
              }}>
                {m.content || (loading && i === messages.length - 1 ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : '')}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ask about automation ROI, costs, tasks…"
              rows={2}
              style={{
                flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)',
                fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit',
                lineHeight: 1.5,
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <button
              className="btn btn-primary pulse-glow"
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              style={{ padding: '10px 14px', flexShrink: 0, opacity: loading || !input.trim() ? 0.5 : 1 }}
            >
              {loading ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={15} />}
            </button>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6 }}>All numbers are pre-computed and cited from your actual data.</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );
}
