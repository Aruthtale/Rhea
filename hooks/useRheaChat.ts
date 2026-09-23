'use client';

import { useState, useCallback, useEffect } from 'react';
import { eventBus } from '@/engines/eventBus';
import { MessageRepository, type ChatMessage } from '@/engines/messageRepository';

export type { ChatMessage };

export function useRheaChat(conversationId = 'default') {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<string>('local');

  // Muat pesan dari repository saat mount & sync via EventBus
  useEffect(() => {
    setMessages(MessageRepository.getAll(conversationId));

    const unsub = eventBus.on('ai:responded', () => {
      setMessages(MessageRepository.getAll(conversationId));
    });

    return () => {
      unsub();
    };
  }, [conversationId]);

  const send = useCallback(async (rawText?: string) => {
    const text = (rawText ?? input).trim();
    if (!text || isLoading) return;
    setInput('');

    // 1. Simpan pesan user ke MessageRepository & update UI
    MessageRepository.add('user', text, undefined, conversationId);
    setMessages(MessageRepository.getAll(conversationId));
    setIsLoading(true);

    // EventBus: sinyal AI mulai berpikir
    eventBus.emit('ai:thinking', { message: text });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const usedProvider = data.provider || provider;
      if (data.provider) setProvider(data.provider);

      const reply: string = data.reply || data.error || 'Hmm, aku lagi bengong bentar.. coba lagi yaa Zen T___T';

      // 2. Simpan balasan Rhea ke MessageRepository & update UI
      MessageRepository.add('rhea', reply, usedProvider, conversationId);
      setMessages(MessageRepository.getAll(conversationId));

      // EventBus: sinyal AI selesai menjawab
      eventBus.emit('ai:responded', {
        userMessage: text,
        rheaReply: reply,
        provider: usedProvider,
        timestamp: new Date().toISOString(),
      });
    } catch {
      const fallback = 'Iyaaa nunu, koneksinya putus bentar.. tapi aku tetep di sini kok temenin kamu!';
      const fallbackProvider = 'offline-heuristic';
      setProvider(fallbackProvider);

      MessageRepository.add('rhea', fallback, fallbackProvider, conversationId);
      setMessages(MessageRepository.getAll(conversationId));

      eventBus.emit('ai:responded', {
        userMessage: text,
        rheaReply: fallback,
        provider: fallbackProvider,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, provider, conversationId]);

  const clearChat = useCallback(() => {
    MessageRepository.clear(conversationId);
    setMessages(MessageRepository.getAll(conversationId));
  }, [conversationId]);

  return { messages, input, setInput, isLoading, provider, send, clearChat };
}
