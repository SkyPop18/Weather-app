/* Local production-style server for Clay Weather + Gemini. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}
const apiKey = process.env.GEMINI_API_KEY;
const port = Number(process.env.PORT || 3000);
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const SUPPORTED_LANGUAGES = new Set(['English', 'Hindi', 'Tamil', 'Marathi', 'Sanskrit', 'French', 'German', 'Spanish', 'Italian', 'Portuguese', 'Bengali', 'Telugu', 'Kannada', 'Malayalam', 'Urdu', 'Japanese', 'Korean', 'Chinese']);
const rateLimitFile = path.join(root, 'rate-limit-store.json');
let rateLimits = new Map();
try {
  if (fs.existsSync(rateLimitFile)) rateLimits = new Map(Object.entries(JSON.parse(fs.readFileSync(rateLimitFile, 'utf8'))));
} catch (error) {
  console.warn('Could not load local Weather AI limits:', error.message);
}
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };

function replyJson(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 100000) throw new Error('Request is too large.');
  }
  return JSON.parse(body || '{}');
}

function consumeMessageAllowance(clientId, consume = true) {
  const now = Date.now();
  const key = crypto.createHash('sha256').update(clientId).digest('hex');
  const active = (rateLimits.get(key) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (active.length >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: new Date(active[0] + RATE_WINDOW_MS).toISOString() };
  }
  if (!consume) return { allowed: true, remaining: RATE_LIMIT - active.length, resetAt: active.length ? new Date(active[0] + RATE_WINDOW_MS).toISOString() : null };
  active.push(now);
  rateLimits.set(key, active);
  try {
    fs.writeFileSync(rateLimitFile, JSON.stringify(Object.fromEntries(rateLimits)), { encoding: 'utf8', mode: 0o600 });
  } catch (error) {
    console.warn('Could not save local Weather AI limits:', error.message);
  }
  return { allowed: true, remaining: RATE_LIMIT - active.length, resetAt: new Date(active[0] + RATE_WINDOW_MS).toISOString() };
}

function buildPrompt({ message, history, weather, language }) {
  const safeHistory = Array.isArray(history) ? history.slice(-8).map((item) => ({
    role: item.role === 'model' ? 'model' : 'user',
    parts: [{ text: String(item.text || '').slice(0, 1500) }]
  })) : [];
  const context = JSON.stringify(weather);
  return {
    systemInstruction: { parts: [{ text: `You are Weather AI inside Clay Weather. Only answer practical questions that help someone plan around the supplied weather: conditions, forecasts, clothing, outdoor plans, weather-aware food and hydration. Politely refuse unrelated conversation in one sentence. Use ONLY supplied live weather context for weather claims. Clearly say when a detail is not available. Do not give medical or emergency advice; for severe weather, advise checking official local alerts. Write concise plain text: never use Markdown, asterisks, headings, or bullet characters. Respond in ${language}.` }] },
    contents: [...safeHistory, { role: 'user', parts: [{ text: `Live weather context (shared by the user): ${context}\n\nUser question: ${String(message).slice(0, 1000)}` }] }],
    generationConfig: { temperature: 0.45, maxOutputTokens: 450 }
  };
}

function isWeatherQuestion(message, history) {
  const topic = /weather|forecast|temperature|rain|snow|wind|humid|cloud|sun|storm|uv|air quality|visibility|pressure|wear|clothes|clothing|outdoor|outside|walk|run|travel|umbrella|jacket|coat|eat|food|drink|hydration|allerg|m[eé]t[eé]o|pluie|v[eê]tement|porter|dehors|manger|boire|wetter|regen|kleidung|anziehen|draußen|essen|trinken|tiempo|lluvia|ropa|salir|comer|beber|meteo|pioggia|vestiti|uscire|mangiare|clima|chuva|roupa|sair|मौसम|बारिश|वर्षा|हवा|गर्मी|ठंड|कपड़े|पहन|बाहर|खाना|पीना|आर्द्रता|வானிலை|மழை|வெயில்|காற்று|உடை|வெளியே|சாப்பிட|குடிக்க|हवामान|पाऊस|वारा|कपडे|बाहेर|खाण|प्यायला|पर्जन्य|वृष्टि|वातावरण|আবহাওয়া|বৃষ্টি|వాతావరణం|వర్షం|ಹವಾಮಾನ|ಮಳೆ|കാലാവസ്ഥ|മഴ|موسم|بارش/i;
  const followUp = /^(tell|say|explain|answer|translate|repeat|make|in |hindi|english|simple|short|more|what about|and |हिंदी|हिन्दी|தமிழ்|मराठी|संस्कृत|फ्रेंच|जर्मन)/i;
  return topic.test(message) || (history?.length && followUp.test(message.trim()));
}

async function handleAi(req, res) {
  if (!apiKey) return replyJson(res, 500, { error: 'Gemini is not configured. Add GEMINI_API_KEY to .env.' });
  try {
    const payload = await readJson(req);
    if (!payload.message || !payload.weather?.location) return replyJson(res, 400, { error: 'Choose a weather location before chatting.' });
    if (!isWeatherQuestion(String(payload.message), payload.history)) return replyJson(res, 422, { error: 'Weather AI only answers weather, clothing, outdoor-plan, and weather-aware food or hydration questions.' });
    const clientId = req.socket.remoteAddress || 'unknown';
    const allowance = consumeMessageAllowance(clientId);
    if (!allowance.allowed) return replyJson(res, 429, { error: `You’ve reached the ${RATE_LIMIT}-message limit. Please try again after ${new Date(allowance.resetAt).toLocaleString()}.`, ...allowance });
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(buildPrompt({ ...payload, language: SUPPORTED_LANGUAGES.has(payload.language) ? payload.language : 'English' }))
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Gemini error:', response.status, data?.error?.message);
      return replyJson(res, 502, { error: 'Gemini could not answer right now. Please try again shortly.' });
    }
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    if (!text) return replyJson(res, 502, { error: 'Gemini returned an empty reply. Please try again.' });
    return replyJson(res, 200, { reply: text, ...allowance });
  } catch (error) {
    console.error('Weather AI error:', error.message, error.cause?.message || '');
    return replyJson(res, 503, { error: 'Weather AI could not be reached. Please try again shortly.' });
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'POST' && url.pathname === '/api/weather-assistant') return handleAi(req, res);
  if (req.method === 'GET' && url.pathname === '/api/weather-assistant/limit') {
    const clientId = req.socket.remoteAddress || 'unknown';
    return replyJson(res, 200, consumeMessageAllowance(clientId, false));
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return replyJson(res, 405, { error: 'Method not allowed.' });
  let requested;
  try { requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  if (requested !== '/index.html' && !/^\/(?:css|js)\/[\w.-]+\.(?:css|js)$/.test(requested)) {
    res.writeHead(404); return res.end('Not found');
  }
  const filePath = path.resolve(root, `.${requested}`);
  if (!filePath.startsWith(root + path.sep) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(filePath).pipe(res);
}).listen(port, () => console.log(`Clay Weather is running at http://localhost:${port}`));
