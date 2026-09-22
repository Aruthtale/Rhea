'use client';

import { useState, useCallback } from 'react';

export interface ChatMessage {
  role: 'rhea' | 'user';
  text: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  { role: 'rhea', text: 'Hai Zen, hari ini udah siap apa nggak? Jangan lupa istirahat yaa kalau udah lelah' },
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
    } catch {
      setMessages((prev) => [...prev, { role: 'rhea', text: 'Iyaaa nunu, koneksinya putus bentar.. tapi aku tetep di sini kok temenin kamu!' }]);
      setProvider('offline-heuristic');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  return { messages, input, setInput, isLoading, provider, send };
}
