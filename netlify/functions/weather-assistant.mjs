import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';

const RATE_LIMIT = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const SUPPORTED_LANGUAGES = new Set(['English', 'Hindi', 'Tamil', 'Marathi', 'Sanskrit', 'French', 'German', 'Spanish', 'Italian', 'Portuguese', 'Bengali', 'Telugu', 'Kannada', 'Malayalam', 'Urdu', 'Japanese', 'Korean', 'Chinese']);
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function isWeatherQuestion(message, history) {
  const topic = /weather|forecast|temperature|rain|snow|wind|humid|cloud|sun|storm|uv|air quality|visibility|pressure|wear|clothes|clothing|outdoor|outside|walk|run|travel|umbrella|jacket|coat|eat|food|drink|hydration|allerg|m[eé]t[eé]o|pluie|v[eê]tement|porter|dehors|manger|boire|wetter|regen|kleidung|anziehen|draußen|essen|trinken|tiempo|lluvia|ropa|salir|comer|beber|meteo|pioggia|vestiti|uscire|mangiare|clima|chuva|roupa|sair|मौसम|बारिश|वर्षा|हवा|गर्मी|ठंड|कपड़े|पहन|बाहर|खाना|पीना|ஆவானிலை|வானிலை|மழை|வெயில்|காற்று|உடை|வெளியே|சாப்பிட|குடிக்க|हवामान|पाऊस|वारा|कपडे|बाहेर|खाण|प्यायला|पर्जन्य|वृष्टि|वातावरण|আবহাওয়া|বৃষ্টি|వాతావరణం|వర్షం|ಹವಾಮಾನ|ಮಳೆ|കാലാവസ്ഥ|മഴ|موسم|بارش/i;
  const followUp = /^(tell|say|explain|answer|translate|repeat|make|in |hindi|english|simple|short|more|what about|and |हिंदी|हिन्दी|தமிழ்|मराठी|संस्कृत)/i;
  return topic.test(message) || (history?.length && followUp.test(message.trim()));
}

function userKey(request, context) {
  const source = context.ip || 'unknown';
  return `limit/${createHash('sha256').update(source).digest('hex')}`;
}

async function takeAllowance(request, context) {
  const store = getStore({ name: 'weather-ai-limits', consistency: 'strong' });
  const key = userKey(request, context);
  const now = Date.now();
  const prior = await store.get(key, { type: 'json', consistency: 'strong' }) || { timestamps: [] };
  const timestamps = prior.timestamps.filter((time) => now - time < WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT) return { allowed: false, remaining: 0, resetAt: new Date(timestamps[0] + WINDOW_MS).toISOString() };
  timestamps.push(now);
  const result = { allowed: true, remaining: RATE_LIMIT - timestamps.length, resetAt: new Date(timestamps[0] + WINDOW_MS).toISOString() };
  await store.setJSON(key, { timestamps }, { consistency: 'strong' });
  return result;
}

async function readAllowance(request, context) {
  const store = getStore({ name: 'weather-ai-limits', consistency: 'strong' });
  const key = userKey(request, context);
  const now = Date.now();
  const prior = await store.get(key, { type: 'json', consistency: 'strong' }) || { timestamps: [] };
  const timestamps = prior.timestamps.filter((time) => now - time < WINDOW_MS);
  return { allowed: timestamps.length < RATE_LIMIT, remaining: Math.max(0, RATE_LIMIT - timestamps.length), resetAt: timestamps.length ? new Date(timestamps[0] + WINDOW_MS).toISOString() : null };
}

function buildRequest({ message, history, weather, language }) {
  const safeHistory = Array.isArray(history) ? history.slice(-8).map((item) => ({ role: item.role === 'model' ? 'model' : 'user', parts: [{ text: String(item.text || '').slice(0, 1500) }] })) : [];
  return {
    systemInstruction: { parts: [{ text: `You are Weather AI inside Clay Weather. Only answer practical questions that help someone plan around the supplied weather: conditions, forecasts, clothing, outdoor plans, weather-aware food and hydration. Politely refuse unrelated conversation in one sentence. Use ONLY supplied live weather context for weather claims. Write concise plain text: never use Markdown, asterisks, headings, or bullet characters. Respond in ${language}.` }] },
    contents: [...safeHistory, { role: 'user', parts: [{ text: `Live weather context: ${JSON.stringify(weather)}\n\nUser question: ${String(message).slice(0, 1000)}` }] }],
    generationConfig: { temperature: 0.45, maxOutputTokens: 450 }
  };
}

export default async (request, context) => {
  if (request.method === 'GET') {
    try { return json(await readAllowance(request, context)); }
    catch (error) { console.error('Weather AI quota read failed:', error.message); return json({ error: 'Could not read the Weather AI limit.' }, 503); }
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  if (!process.env.GEMINI_API_KEY) return json({ error: 'Weather AI is not configured.' }, 500);
  try {
    const payload = await request.json();
    if (!payload.message || !payload.weather?.location) return json({ error: 'Choose a weather location before chatting.' }, 400);
    if (!isWeatherQuestion(String(payload.message), payload.history)) return json({ error: 'Weather AI only answers weather, clothing, outdoor-plan, and weather-aware food or hydration questions.' }, 422);
    const allowance = await takeAllowance(request, context);
    if (!allowance.allowed) return json({ error: `You’ve reached the ${RATE_LIMIT}-message limit. Please try again after ${new Date(allowance.resetAt).toLocaleString()}.`, ...allowance }, 429);
    const language = SUPPORTED_LANGUAGES.has(payload.language) ? payload.language : 'English';
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY }, body: JSON.stringify(buildRequest({ ...payload, language }))
    });
    const data = await response.json();
    if (!response.ok) return json({ error: 'Gemini could not answer right now. Please try again shortly.' }, 502);
    const reply = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    return reply ? json({ reply, ...allowance }) : json({ error: 'Gemini returned an empty reply. Please try again.' }, 502);
  } catch (error) {
    console.error('Weather AI function error:', error.message);
    return json({ error: 'Weather AI could not be reached. Please try again shortly.' }, 503);
  }
};
