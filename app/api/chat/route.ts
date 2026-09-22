import { NextResponse } from 'next/server';
import { RENATHA_SYSTEM_PROMPT } from '@/engines/personality/renathaVoice';
import { ContextBuilder } from '@/engines/contextBuilder';

export const maxDuration = 120;

async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data, raw: text };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, currentTask } = body;

    if (!message) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 });
    }

    const { systemPrompt } = ContextBuilder.buildContext(message, currentTask);
    const fullSystemInstruction = `${RENATHA_SYSTEM_PROMPT}\n\n${systemPrompt}`;

    const ROUTER_BASE_URL = process.env.ROUTER_BASE_URL || 'http://localhost:20128/v1';
    const ROUTER_API_KEY = process.env.ROUTER_API_KEY || '';
    const ROUTER_MODEL = process.env.ROUTER_MODEL || 'ArMes';
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
    const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

    let botResponse = '';
    let usedProvider = '';

    // 1. Jalur utama: ArMes via 9Router lokal (combo multi-model + autofallback internal)
    if (ROUTER_API_KEY) {
      try {
        const r = await postJson(
          `${ROUTER_BASE_URL}/chat/completions`,
          {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ROUTER_API_KEY}`,
          },
          {
            model: ROUTER_MODEL,
            messages: [
              { role: 'system', content: fullSystemInstruction },
              { role: 'user', content: message },
            ],
            temperature: 0.75,
            max_tokens: 600,
            stream: false,
          },
          90000,
        );
        const content: string =
          r.data?.choices?.[0]?.message?.content ||
          (typeof r.data === 'string' ? r.data : '');
        if (r.ok && content) {
          botResponse = content;
          usedProvider = 'local';
        } else {
          console.warn(`[chat] ArMes gagal (status ${r.status}). Lanjut ke fallback Gemini.`, (r.raw || '').slice(0, 300));
        }
      } catch (localErr) {
        console.warn('[chat] ArMes tidak terjangkau/timeout. Lanjut ke fallback Gemini.', localErr);
      }
    } else {
      console.warn('[chat] ROUTER_API_KEY kosong. Langsung ke fallback Gemini.');
    }

    // 2. Fallback: Google Gemini Cloud (3.8 Flash — model lama di bawah 3.5 sudah pensiun)
    if (!botResponse) {
      usedProvider = 'gemini-fallback';
      if (GEMINI_API_KEY) {
        try {
          const g = await postJson(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
            { 'Content-Type': 'application/json' },
            {
              system_instruction: { parts: [{ text: fullSystemInstruction }] },
              contents: [{ role: 'user', parts: [{ text: message }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
            },
            60000,
          );
          const gText: string = g.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (g.ok && gText) {
            botResponse = gText;
          } else {
            console.error(`[chat] Gemini fallback gagal (status ${g.status}).`, (g.raw || '').slice(0, 300));
          }
        } catch (gErr) {
          console.error('[chat] Gemini fallback error:', gErr);
        }
      } else {
        console.warn('[chat] GEMINI_API_KEY kosong, lewati fallback cloud.');
      }
    }

    // 3. Terakhir: balasan offline heuristic khas Renatha
    if (!botResponse) {
      usedProvider = 'offline-heuristic';
      const offlineReplies = [
        'Iyaaa nunu, aku di sinii kok temenin kamu.. koneksi AI-nya lagi putus yaa? Tetep semangatt yaa kerjanyaa!',
        'Zen, jangan lupa minum air duluu yaa. Nanti pas koneksinya balik kita lanjut ngobrol lagii :3',
        'Udaa jam segini lohh zenn, kamu jangan terlalu capek yaa.. pelan-pelan aja ngerjainnya T___T',
        'Semangat ya nunuu sayangg! Nanti kalau udah selesai kita rehat bareng yaa.',
      ];
      botResponse = offlineReplies[Math.floor(Math.random() * offlineReplies.length)];
    }

    return NextResponse.json({
      reply: botResponse,
      provider: usedProvider,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
