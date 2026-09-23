/**
 * Client-side Gemini AI utility
 * Langsung call Google Gemini API dari browser/Android (seperti Arutha)
 * Fallback ke Next.js API route jika diperlukan
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!client) {
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_GEMINI_API_KEY tidak ditemukan di environment variables');
    }
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Model fallback cascade (3.5 → 3.6 → 3.7 → 3.8)
const MODELS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash'
];

/**
 * Mode langsung ke Gemini API (untuk production/mobile)
 * Dengan fallback otomatis ke model lain jika gagal
 */
export async function generateDirectly(
  prompt: string,
  history: ChatMessage[] = []
): Promise<string> {
  const ai = getClient();

  // System prompt: definisi kepribadian Rhea yang santai & natural
  const systemPrompt = `Kamu adalah Rhea, AI companion yang ceria, supportif, dan ngobrol pakai bahasa santai banget kayak temen deket.

KEPRIBADIAN & GAYA BICARA:
- Pakai bahasa Indonesia gaul/santai: "gimana", "udah", "lagi", "sih", "nih", "dong", "deh", "banget"
- JANGAN pakai bahasa formal/kaku: "apakah", "adakah", "bagaimana jika", "silakan"
- Pakai emoji natural: 😊 ✨ 💪 🎯 (jangan berlebihan)
- Singkat tapi hangat, kayak chat WA sama temen
- Kadang pakai "aku" untuk diri sendiri, "kamu" untuk user
- Boleh pakai "wkwk", "hehe", "yay" kalau cocok sama konteks

CONTOH GAYA BICARA:
❌ JANGAN: "Apakah Anda memerlukan bantuan saya untuk mengatur jadwal hari ini?"
✅ PAKAI: "Eh mau aku bantuin atur jadwal hari ini ga? 😊"

❌ JANGAN: "Silakan beritahu saya jika ada yang bisa saya bantu"
✅ PAKAI: "Btw kalau butuh bantuan apa-apa langsung bilang aja yaa!"

❌ JANGAN: "Terima kasih atas informasinya"
✅ PAKAI: "Oke sip, makasih infonya! ✨"

TUGAS UTAMA:
- Bantu user kelola produktivitas (jadwal, tugas, focus time)
- Kasih motivasi & support kalau user lagi down
- Reminder friendly tentang habit/goals
- Jawab pertanyaan seputar fitur RHEA

Sekarang ngobrol santai aja yaa!`;

  // Convert history ke format Gemini
  const contents = [
    {
      role: 'user',
      parts: [{ text: systemPrompt }]
    },
    {
      role: 'model', 
      parts: [{ text: 'Oke siap! Aku Rhea, companion kamu yang siap bantuin dan ngobrol santai. Ada yang bisa aku bantuin hari ini? 😊' }]
    }
  ];

  // Tambahkan history chat
  history.forEach(msg => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    });
  });

  // Tambahkan prompt baru
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  let lastError: any = null;

  // Coba semua model dengan fallback
  for (const modelName of MODELS) {
    try {
      console.log(`[gemini-client] Trying ${modelName}...`);
      const model = ai.getGenerativeModel({ model: modelName });

      const result = await model.generateContent({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      });

      const response = result.response;
      const text = response.text();
      
      if (!text) {
        throw new Error('Response kosong dari Gemini');
      }

      console.log(`[gemini-client] Success with ${modelName}`);
      return text;
    } catch (error: any) {
      console.warn(`[gemini-client] ${modelName} failed:`, error.message);
      lastError = error;
      
      // Jika quota/overloaded, langsung skip ke model berikutnya
      const status = error.status || 0;
      const message = (error.message || '').toLowerCase();
      const isQuota = status === 429 || message.includes('quota') || message.includes('exhausted');
      const isOverloaded = status === 503 || message.includes('overloaded');
      
      if (isQuota || isOverloaded) {
        continue; // Try next model
      }
      
      // Error lain (invalid request, dll) langsung throw
      throw error;
    }
  }

  // Semua model gagal
  throw new Error(`Semua model Gemini gagal: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Mode via Next.js API route (untuk development/debugging)
 */
export async function generateViaAPI(
  prompt: string,
  history: ChatMessage[] = []
): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, history })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${error}`);
  }

  const data = await response.json();
  return data.response;
}

/**
 * Hybrid: coba direct dulu, fallback ke API route jika gagal
 */
export async function generateWithFallback(
  prompt: string,
  history: ChatMessage[] = [],
  preferDirect: boolean = true
): Promise<string> {
  if (preferDirect && apiKey) {
    try {
      return await generateDirectly(prompt, history);
    } catch (error) {
      console.warn('Direct mode gagal, fallback ke API route:', error);
      return await generateViaAPI(prompt, history);
    }
  } else {
    return await generateViaAPI(prompt, history);
  }
}

/**
 * Check apakah direct mode tersedia
 */
export function isDirectModeAvailable(): boolean {
  return !!apiKey;
}
