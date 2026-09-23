'use client';

import { useState, useCallback } from 'react';
import { eventBus } from '@/engines/eventBus';

export interface ChatMessage {
  role: 'rhea' | 'user';
  text: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  { role: 'rhea', text: 'Hai Zen, hari ini udah siap apa nggak? Jangan lupa istirahat yaa kalau udah cape' },
];

export function useRheaChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<string>('local');

  const send = useCallback(async (rawText?: string) => {
    const text = (rawText ?? input).trim();
    if (!text || isLoading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setIsLoading(true);

    // EventBus: sinyal AI mulai berpikir (docs 02 §Contoh Sinyal Event)
    eventBus.emit('ai:thinking', { message: text });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (data.provider) setProvider(data.provider);
      const reply: string = data.reply || data.error || 'Hmm, aku lagi bengong bentar.. coba lagi yaa Zen T___T';
      setMessages((prev) => [...prev, { role: 'rhea', text: reply }]);

      // EventBus: sinyal AI selesai menjawab → tersimpan ke history context
      eventBus.emit('ai:responded', {
        userMessage: text,
        rheaReply: reply,
        provider: data.provider || provider,
        timestamp: new Date().toISOString(),
      });
    } catch {
      const fallback = 'Iyaaa nunu, koneksinya putus bentar.. tapi aku tetep di sini kok temenin kamu!';
      setMessages((prev) => [...prev, { role: 'rhea', text: fallback }]);
      setProvider('offline-heuristic');
      eventBus.emit('ai:responded', {
        userMessage: text,
        rheaReply: fallback,
        provider: 'offline-heuristic',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, provider]);

  return { messages, input, setInput, isLoading, provider, send };
}
