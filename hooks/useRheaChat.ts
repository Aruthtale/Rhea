'use client';

import { useState, useCallback, useEffect } from 'react';
import { eventBus } from '@/engines/eventBus';
import { MessageRepository, type ChatMessage } from '@/engines/messageRepository';
import { getApiBase } from '@/engines/apiBase';
import { generateDirectly, generateViaAPI, isDirectModeAvailable } from '@/lib/gemini-client';

export type { ChatMessage };

export function useRheaChat(conversationId = 'default') {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<string>('checking');

  // Deteksi mode yang tersedia saat mount
  useEffect(() => {
    const hasDirectAccess = isDirectModeAvailable();
    setProvider(hasDirectAccess ? 'gemini-direct' : 'local-or-api');
  }, []);

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
      let reply: string;
      let usedProvider: string;

      // HYBRID: Coba direct mode dulu (langsung ke Gemini dari client)
      const hasDirectAccess = isDirectModeAvailable();
      
      if (hasDirectAccess) {
        try {
          console.log('[useRheaChat] Trying direct Gemini mode...');
          
          // Convert MessageRepository history ke format yang dibutuhkan
          const history = MessageRepository.getAll(conversationId)
            .slice(-10) // Ambil 10 pesan terakhir untuk context
            .map(msg => ({
              role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
              content: msg.text
            }));

          reply = await generateDirectly(text, history);
          usedProvider = 'gemini-direct';
          console.log('[useRheaChat] Direct mode success!');
        } catch (directError) {
          console.warn('[useRheaChat] Direct mode failed, fallback to API route:', directError);
          
          // Fallback ke API route (9Router local atau Next.js API)
          const apiBase = getApiBase();
          const res = await fetch(`${apiBase}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text }),
          });
          const data = await res.json();
          reply = data.reply || data.error || 'API route error';
          usedProvider = data.provider || 'local-fallback';
        }
      } else {
        // Tidak ada direct access, langsung pakai API route
        console.log('[useRheaChat] No direct access, using API route...');
        const apiBase = getApiBase();
        const res = await fetch(`${apiBase}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();
        reply = data.reply || data.error || 'Hmm, aku lagi bengong bentar.. coba lagi yaa Zen T___T';
        usedProvider = data.provider || 'local';
      }

      setProvider(usedProvider);

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
    } catch (error) {
      console.error('[useRheaChat] Complete failure:', error);
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
  }, [input, isLoading, conversationId]);

  const clearChat = useCallback(() => {
    MessageRepository.clear(conversationId);
    setMessages(MessageRepository.getAll(conversationId));
  }, [conversationId]);

  return { messages, input, setInput, isLoading, provider, send, clearChat };
}
