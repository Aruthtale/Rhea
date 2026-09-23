/**
 * Client-side Gemini AI utility
 *
 * Catatan keamanan: API key TIDAK lagi dibake ke client bundle.
 * Sebelumnya NEXT_PUBLIC_GEMINI_API_KEY ter-inline di JS yang bisa dibaca
 * siapa pun yang membuka APK. Sekarang semua request melalui /api/chat
 * yang menjaga key di server.
 */

// Model fallback cascade — hanya model yang benar-benar ada.
// 3.5 dan 3.6 sudah pensiun/tdk pernah release publik, jadi jangan dipakai.
const MODELS = [
  'gemini-3.7-flash',
  'gemini-3.8-flash'
];

// Direct mode (client → Gemini langsung) sudah DIMATIKAN.
// Alasan: NEXT_PUBLIC_GEMINI_API_KEY ter-inline ke JS bundle dan bisa dibaca
// langsung dari dalam APK. Sekarang semua chat lewat /api/chat (server route)
// yang menjaga GEMINI_API_KEY tetap rahasia.
//
// Untuk menyalakan kembali direct mode, isi nilai ini dari env khusus device
// terdaftar — tapi sadar bahwa key-nya akan terlihat di bundle.
const DIRECT_API_KEY = '';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Mode langsung ke Gemini API (untuk production/mobile)
 * Dengan fallback otomatis ke model lain jika gagal
 */
export async function generateDirectly(
  prompt: string,
  history: ChatMessage[] = []
): Promise<string> {
  if (!DIRECT_API_KEY) {
    throw new Error('Direct mode dinonaktifkan — API key tidak boleh dibake ke client. Gunakan generateViaAPI().');
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const ai = new GoogleGenerativeAI(DIRECT_API_KEY);

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
  if (preferDirect && DIRECT_API_KEY) {
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
  return !!DIRECT_API_KEY;
}
