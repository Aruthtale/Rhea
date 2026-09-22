import { NextResponse } from 'next/server';
import { RENATHA_SYSTEM_PROMPT } from '@/engines/personality/renathaVoice';
import { ContextBuilder } from '@/engines/contextBuilder';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, currentTask } = body;

    if (!message) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 });
    }

    const { systemPrompt } = ContextBuilder.buildContext(message, currentTask);
    const fullSystemInstruction = `${RENATHA_SYSTEM_PROMPT}\n\n${systemPrompt}`;

    const HERMES_LOCAL_URL = process.env.HERMES_URL || 'http://127.0.0.1:9000/v1/chat/completions';
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    let botResponse = '';
    let usedProvider = 'local';

    // 1. Coba koneksi ke Hermes / 9Router lokal
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2200);

      const localRes = await fetch(HERMES_LOCAL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'hermes-3-llama-3.1-8b',
          messages: [
            { role: 'system', content: fullSystemInstruction },
            { role: 'user', content: message },
          ],
          temperature: 0.75,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (localRes.ok) {
        const localData = await localRes.json();
        botResponse = localData.choices?.[0]?.message?.content || '';
      } else {
        throw new Error('Local core unreachable');
      }
    } catch (localErr) {
      console.warn('Hermes local offline/timeout. Switching fallback to Gemini Cloud...', localErr);
      usedProvider = 'gemini-fallback';

      // 2. Fallback otomatis ke Google Gemini Cloud API
      if (GEMINI_API_KEY) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: {
                  parts: [{ text: fullSystemInstruction }],
                },
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: message }],
                  },
                ],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 300,
                },
              }),
            }
          );

          if (geminiRes.ok) {
            const gData = await geminiRes.json();
            botResponse =
              gData.candidates?.[0]?.content?.parts?.[0]?.text ||
              'Iyaaa nunu, aku denger kok.. tapi sinyalnya agak lemot bentaarr yaa T___T';
          }
        } catch (gErr) {
          console.error('Gemini fallback failed:', gErr);
        }
      }
    }

    // Jika offline sama sekali, berikan respons persona Renatha cerdas offline
    if (!botResponse) {
      usedProvider = 'offline-heuristic';
      const offlineReplies = [
        "Iyaaa nunu, aku di sinii kok temenin kamu.. laptop lagi offline yaa? Tetep semangatt yaa kerjanyaa!",
        "Zen, jangan lupa minum air duluu yaa. Nanti pas laptop nyala lagi kita lanjut ngobrol lagii :3",
        "Udaa jam segini lohh zenn, kamu jangan terlalu capek yaa.. pelan-pelan aja ngerjainnya T___T",
        "Semangat ya nunuu sayangg! Nanti kalau udah selesai kita rehat bareng yaa."
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
