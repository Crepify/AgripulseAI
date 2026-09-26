// "Jarvis" knowledge endpoint — answers ANY question, keyless & free.
//
// The in-app assistant can only navigate to 9 fixed screens; for everything
// else (weather words, general knowledge, "who is...", prices, math...) it
// used to stay silent. This endpoint gives it real answers:
//
//   1. Pure math            → safe tokenizer + shunting-yard (no eval)
//   2. Greetings / identity → friendly localized reply
//   3. Jarvis AI            → keyless conversational model (Pollinations),
//                            remembers the last exchange for follow-ups,
//                            always answers in the farmer's language
//   4. Wikipedia            → the farmer's OWN language edition first
//                            (hi/ta/te/kn/mr/gu/bn/pa/ml/or/as/ur/en),
//                            falling back to English Wikipedia
//   5. DuckDuckGo Instant Answer → extra coverage (free, no key)
//   6. Honest "I don't know yet" + Kisan Call Centre — NEVER silence
//
// GET /api/ask?q=...&lang=hi[&ctx={"q":..,"a":..}]  → { answer, source, lang }

const MAX_Q = 300;
const UPSTREAM_TIMEOUT = 4500;

// Module-level cache (best-effort, like the TTS proxy). Vercel reuses warm
// lambdas, so repeat questions in a burst are free.
const CACHE = new Map();
const CACHE_MAX = 80;
const CACHE_TTL = 10 * 60 * 1000;

const WIKI_LANGS = new Set(['hi', 'en', 'ta', 'te', 'kn', 'mr', 'gu', 'bn', 'pa', 'ml', 'or', 'as', 'ur']);

// ───────────────────────────── math (no eval, ever) ─────────────────────

function tryMath(raw) {
  // Strip courtesy/math words in a few languages, keep expression chars.
  // Stopwords are dropped as WHOLE TOKENS only — a plain regex for "का" would
  // also mangle words that merely contain those letters (कार → र).
  const STOP = new Set(['what', 'is', 'whats', "what's", 'calculate', 'compute', 'solve',
    'equals', 'equal', 'please', 'kya', 'hota', 'hoti', 'hote', 'hoga', 'hogi', 'hai',
    'kitna', 'kitne', 'batao', 'btado', 'of', 'and', 'plus', 'minus', 'into', 'गुणा', 'जोड़',
    'कितना', 'कितने', 'होता', 'होती', 'होते', 'होगा', 'होगी', 'जी', 'बराबर', 'और',
    'का', 'की', 'के', 'में', 'से', 'पर']);
  let q = String(raw || '')
    .replace(/[=?]/g, ' ')
    .replace(/×/g, '*')
    .replace(/[xX÷]/g, (m) => (m === '÷' ? '/' : '*'))
    .split(/\s+/)
    .filter(w => w && !STOP.has(w.toLowerCase()))
    .join(' ')
    .trim();
  if (!/^[\d\s+\-*/().^%]+$/.test(q)) return null;
  if (!/\d/.test(q) || !/[+\-*/^%]/.test(q)) return null; // need digit AND operator
  // Pure percent-of forms. Multiplication commutes, so both orders work:
  //   "50 का 20%" → "50 20%"  → (20/100)*50
  //   "18% of 500" → "18% 500" → (18/100)*500
  const purePctAB = q.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*%$/);
  const purePctBA = q.match(/^(\d+(?:\.\d+)?)\s*%\s+(\d+(?:\.\d+)?)$/);
  if (purePctAB) q = `(${purePctAB[2]}/100)*${purePctAB[1]}`;
  else if (purePctBA) q = `(${purePctBA[1]}/100)*${purePctBA[2]}`;
  else q = q.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');
  q = q.trim();

  // tokenize
  const tokens = q.match(/\d+(?:\.\d+)?|[+\-*/()^]/g);
  if (!tokens) return null;
  // reject sequences like "5 5" (two numbers with no operator)
  let prev = null;
  for (const tk of tokens) {
    if (prev !== null && /[\d.]/.test(tk[0]) && /[\d.]/.test(String(prev)[0])) return null;
    prev = tk;
  }

  const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
  const out = [], ops = [];
  for (const tk of tokens) {
    if (/^\d/.test(tk)) out.push(parseFloat(tk));
    else if (tk === '(') ops.push(tk);
    else if (tk === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop());
      if (!ops.length) return null;
      ops.pop();
    } else {
      while (ops.length && ops[ops.length - 1] !== '(' &&
             (prec[ops[ops.length - 1]] > prec[tk] ||
              (prec[ops[ops.length - 1]] === prec[tk] && tk !== '^'))) out.push(ops.pop());
      ops.push(tk);
    }
  }
  while (ops.length) {
    const op = ops.pop();
    if (op === '(') return null;
    out.push(op);
  }
  const st = [];
  for (const tk of out) {
    if (typeof tk === 'number') st.push(tk);
    else {
      const b = st.pop(), a = st.pop();
      if (a === undefined || b === undefined) return null;
      if (tk === '+') st.push(a + b);
      else if (tk === '-') st.push(a - b);
      else if (tk === '*') st.push(a * b);
      else if (tk === '/') { if (b === 0) return null; st.push(a / b); }
      else if (tk === '^') st.push(Math.pow(a, b));
    }
  }
  if (st.length !== 1 || !isFinite(st[0])) return null;
  const v = st[0];
  const rounded = Math.round(v * 1e6) / 1e6;
  return String(rounded);
}

// ─────────────────────────── question cleanup ───────────────────────────

const FILLERS = [
  /^(please|kripya|कृपया)\s+/i,
  /^(hey|ok|okay|accha|achha|अच्छा)\s+/i,
  /^(do you know|kya aap jaante|क्या आप जानते)\s+/i,
  /^(tell me about|tell me|batao|bataiye|batado|बताओ|बताइए|बता दो)\s*/i,
  /^(what is|what are|what was|whats|what's|who is|who was|who are|where is|when is|when did|why is|define|explain|meaning of|how to|how do i|how does)\s+/i,
  /^(kya hai|kaun hai|kaun tha|kahan hai|kab hua|kyun hai|kaise)\s+/i,
  /(kya hai|kaun hai|kaun tha|kya hote hain|kya hota hai|hai kya|hai kaun)\s*[?.!]*$/i,
  /(what is it|tell me|batao|बताओ|क्या है|कौन है|कौन थे|क्या हैं|क्या होता है|कहाँ है|कब हुआ|के बारे में बताओ|के बारे में|में बताओ|कैसे करें|कैसे करे|कैसे|kaise karein|kaise kare|kaise)\s*[?.!]*$/i,
  /[?.!,;]+$/g,
];

function cleanForSearch(q) {
  let s = String(q || '').trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of FILLERS) {
      const next = s.replace(f, '').trim();
      if (next !== s && next) { s = next; changed = true; }
    }
  }
  return s;
}

// ─────────────────────────────── fetchers ───────────────────────────────

async function getJSON(url, timeout = UPSTREAM_TIMEOUT, retry = true) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { 'User-Agent': 'AgriPulseAI-Assistant/1.0 (farmer voice assistant)' },
    });
    // One gentle retry on throttle/transient errors — shared egress IPs
    // (Vercel functions) occasionally get 429s from Wikipedia.
    if ((res.status === 429 || res.status >= 500) && retry) {
      clearTimeout(t);
      await new Promise(r => setTimeout(r, 350));
      return getJSON(url, timeout, false);
    }
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
  finally { clearTimeout(t); }
}

function firstSentences(text, maxChars = 420) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (t.length <= maxChars) return t;
  const parts = t.split(/(?<=[।.!?])\s+/);
  let out = '';
  for (const p of parts) {
    if ((out + ' ' + p).trim().length > maxChars && out) break;
    out = out ? `${out} ${p}` : p;
  }
  // hard trim mid-sentence if a single sentence blew the budget
  if (out.length > maxChars + 120) out = out.slice(0, maxChars + 120).replace(/\s+\S*$/, '') + '…';
  return out;
}

async function wikipediaSearch(query, wikiLang) {
  if (!query || !WIKI_LANGS.has(wikiLang)) return null;
  const base = `https://${wikiLang}.wikipedia.org`;

  // Search ladder: the full cleaned question first ("टमाटर की खेती कैसे करें"
  // may have no article), then progressively shorter heads ("टमाटर की खेती",
  // "टमाटर") so specific articles win over generic ones like "कृषि".
  const words = query.split(/\s+/).filter(Boolean);
  const attempts = [query];
  if (words.length > 2) attempts.push(words.slice(0, 2).join(' '));
  if (words.length > 1) attempts.push(words[0]);
  const seen = new Set();

  for (const attempt of attempts) {
    if (!attempt || seen.has(attempt)) continue;
    seen.add(attempt);
    const search = await getJSON(
      `${base}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(attempt)}&format=json&srlimit=3`
    );
    let hits = (search?.query?.search || []).filter(h => !/may refer to|बहुविकल्पी|список/i.test(h.title + (h.snippet || '')));
    // Rank by word overlap with the query — "भारत के कृषि मंत्री" should hit
    // the ministry article, not a random "list of firsts" page that merely
    // contains "भारत".
    const qWords = new Set(attempt.toLowerCase().split(/\s+/).filter(w => w.length > 1));
    hits = hits
      .map(h => {
        const tWords = h.title.toLowerCase().split(/\s+/);
        let score = 0;
        for (const w of tWords) if (qWords.has(w)) score += 1;
        return { h, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(x => x.h);
    for (const hit of hits.slice(0, 2)) {
      const sum = await getJSON(`${base}/api/rest_v1/page/summary/${encodeURIComponent(hit.title.replace(/ /g, '_'))}`);
      const extract = sum?.extract;
      if (extract && sum?.type !== 'disambiguation' && extract.length > 40) {
        return { text: firstSentences(extract), title: sum.title || hit.title, wikiLang };
      }
    }
  }
  return null;
}

async function duckduckgo(query) {
  const j = await getJSON(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&t=agripulse`
  );
  const text = j?.Answer || j?.AbstractText || j?.Definition || '';
  if (text && text.length > 20 && !/^https?:\/\//i.test(text)) {
    return { text: firstSentences(text, 380), source: 'duckduckgo' };
  }
  return null;
}

// ─────────────── the Jarvis brain (keyless, free, no install) ───────────

const JARVIS_TIMEOUT = 7000;        // fresh questions — model answers in 1-5s
const JARVIS_CTX_TIMEOUT = 9500;    // follow-ups reason over context → slower
const LANG_NAME = {
  hi: 'Hindi (Devanagari script)', en: 'simple English', ta: 'Tamil', te: 'Telugu',
  kn: 'Kannada', mr: 'Marathi', gu: 'Gujarati', bn: 'Bengali', pa: 'Punjabi (Gurmukhi script)',
  ml: 'Malayalam', or: 'Odia', as: 'Assamese', ur: 'Urdu',
};

function withDeadline(promise, ms, value = null) {
  let timer;
  const timeout = new Promise((r) => { timer = setTimeout(() => r(value), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Spoken-channel cleanup: the reply is READ ALOUD, so markdown/links/lists
// would sound like garbage.
function cleanLlm(text) {
  return String(text || '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[*_`#>|]+/g, '')
    .replace(/^\s*[-•–\d.]+\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600);
}

async function jarvisAnswer(question, pref, ctx) {
  const hasCtx = !!ctx;
  const budget = hasCtx ? JARVIS_CTX_TIMEOUT : JARVIS_TIMEOUT;
  const system = [
    'You are "Kisan Sahayak", the Jarvis-style voice assistant inside the AgriPulse AI app for Indian farmers.',
    `ALWAYS reply ONLY in ${LANG_NAME[pref] || 'simple English'}.`,
    'Your reply is SPOKEN aloud by a text-to-speech voice, so use plain flowing sentences — no markdown, no lists, no emoji, no URLs.',
    'Keep it short: 1-3 sentences for simple questions, at most 5 for complex ones. Use simple words a farmer uses every day.',
    'Be accurate. If you are not sure, say so briefly instead of inventing facts.',
    'For pesticide or medicine dosages, remind to follow the product label. For medical or veterinary problems, advise seeing a doctor or vet.',
  ].join(' ');

  const messages = [{ role: 'system', content: system }];
  try {
    const c = typeof ctx === 'string' ? JSON.parse(ctx) : (ctx || null);
    if (c && c.q && c.a) {
      messages.push({ role: 'user', content: String(c.q).slice(0, 300) });
      messages.push({ role: 'assistant', content: String(c.a).slice(0, 400) });
    }
  } catch {}

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), budget);
  try {
    const call = () => fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      signal: ac.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [...messages, { role: 'user', content: String(question).slice(0, 300) }],
        referrer: 'agripulse.ai',
        private: true,
      }),
    });
    let res;
    if (hasCtx) {
      // Follow-ups are slower (context reasoning) — one clean attempt with
      // the full budget instead of burning it on retries.
      res = await call();
    } else {
      // Anonymous tier gets per-IP 429s (Vercel functions share egress IPs) —
      // escalate the backoff within the same timeout budget.
      for (let attempt = 0; attempt < 3; attempt++) {
        res = await call();
        if (res.ok || (res.status !== 429 && res.status < 500)) break;
        if (attempt < 2) await new Promise(r => setTimeout(r, attempt === 0 ? 500 : 1400));
      }
    }
    if (!res || !res.ok) return null;
    const data = await res.json();
    const text = cleanLlm(data?.choices?.[0]?.message?.content);
    if (!text || text.length < 2) return null;
    return { text, model: data?.model || 'pollinations-openai' };
  } catch { return null; }
  finally { clearTimeout(t); }
}

// ─────────────────────── greetings / identity / thanks ──────────────────

const SMALL_TALK = [
  { re: /^(hi|hello|hey|hola|namaste|namaskar|namaskaram|vanakkam|satsriakal|jai hind|jai kisan|नमस्ते|नमस्कार|हैलो|हेलो|जय हिंद|जय किसान)[\s!.?]*$/i,
    hi: 'नमस्ते जी! मैं आपकी आवाज़ वाला सहायक हूँ। बोलिए, मैं आपकी क्या मदद कर सकता हूँ — खेती, भाव, दवा, या कोई भी सवाल?',
    en: 'Hello! I am your voice assistant. Ask me anything — farming, prices, medicines, or any question at all.' },
  { re: /^(who are you|what is your name|tum kaun ho|aap kaun ho|तुम कौन हो|आप कौन हो|तुम्हारा नाम|आपका नाम)[\s?.!]*$/i,
    hi: 'मैं अग्रीपल्स एआई का आवाज़ सहायक हूँ — आपकी भाषा में जवाब देता हूँ। खेती के 9 काम तो करता हूँ ही, बाकी हर सवाल का जवाब विकिपीडिया से ढूँढ कर बोलता हूँ।',
    en: 'I am the AgriPulse AI voice assistant — I speak your language. I run 9 farming tools for you, and for any other question I find and read out the answer from the web.' },
  { re: /^(thanks|thank you|thankyou|dhanyavad|dhanyawad|shukriya|merci|धन्यवाद|शुक्रिया|आभार)[\s!.?]*$/i,
    hi: 'जी, स्वागत है! कोई और सवाल हो तो बोलिए।',
    en: 'You are most welcome! Ask me anything else anytime.' },
];

// ─────────────────────────────── handler ────────────────────────────────

export default async function handler(req, res) {
  const q = String(req?.query?.q || '').trim();
  const lang = String(req?.query?.lang || 'hi').trim().toLowerCase();
  const pref = (lang === 'en' || !WIKI_LANGS.has(lang)) ? 'en' : lang;

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=6000');

  if (!q) { res.status(400).json({ error: 'bad request — q required' }); return; }
  if (q.length > MAX_Q) { res.status(400).json({ error: 'question too long' }); return; }

  const key = `${pref}:${q.toLowerCase()}`;
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.t < CACHE_TTL) {
    res.status(200).json({ ...hit.v, cached: true });
    return;
  }

  const done = (answer, source, wikiTitle) => {
    const v = { answer, source, lang: pref, ...(wikiTitle ? { wikiTitle } : {}) };
    if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
    CACHE.set(key, { v, t: Date.now() });
    res.status(200).json(v);
  };

  // 1. math ("25*48+12", "18% of 500", "50 का 20% कितना")
  const math = tryMath(q);
  if (math !== null) { done(math, 'math'); return; }

  // 2. greetings / identity / thanks — instant, no network
  for (const s of SMALL_TALK) {
    if (s.re.test(q)) { done(s[pref] || s.en, 'assistant'); return; }
  }

  const subject = cleanForSearch(q);

  // A follow-up ("और उसका इलाज?") carries no standalone meaning — without
  // the conversational model it must NOT become a raw Wikipedia search.
  let hasCtx = false;
  try {
    const c = typeof req?.query?.ctx === 'string' ? JSON.parse(req.query.ctx) : (req?.query?.ctx || null);
    hasCtx = !!(c && c.q && c.a);
  } catch {}

  // 3. The Jarvis brain — a keyless conversational model — racing Wikipedia
  //    in the farmer's own language. Prefer the model's conversational
  //    answer (handles ANY question + follow-up context); Wikipedia is the
  //    reliable fallback when the model is slow or down. EXCEPTION: "who is
  //    / कौन है" questions ask about CURRENT officeholders — Wikipedia is
  //    both faster and fresher there, so it goes first.
  const whoIs = /\b(who is|who was|who are|कौन है|कौन थे|कौन था|कौन हैं|वर्तमान|mukhyamantri|chief minister|prime minister|president of|agriculture minister)\b/i.test(q);
  let llm = null, native = null;
  if (whoIs && !hasCtx) {
    native = await withDeadline(wikipediaSearch(subject, pref), 4500, null);
    if (!native) llm = await jarvisAnswer(q, pref, req?.query?.ctx);
  } else {
    [llm, native] = await Promise.all([
      jarvisAnswer(q, pref, req?.query?.ctx),
      hasCtx ? null : withDeadline(wikipediaSearch(subject, pref), 6000, null),
    ]);
  }
  if (llm) { done(llm.text, 'jarvis', llm.model); return; }
  if (native) { done(native.text, `wikipedia-${native.wikiLang}`, native.title); return; }
  if (hasCtx) {
    // The AI layer is the only thing that can resolve "उसका/its/that" —
    // be honest instead of searching for random words.
    done(
      pref === 'en'
        ? 'Sorry — my connection to the thinking service just failed. Please ask the full question once more.'
        : 'माफ़ कीजिए — सोचने वाली सेवा से अभी जुड़ नहीं पाया। पूरा सवाल एक बार फिर पूछ दीजिए।',
      'none'
    );
    return;
  }

  const [english, ddg] = await Promise.all([
    pref === 'en' ? null : withDeadline(wikipediaSearch(subject, 'en'), 2500, null),
    withDeadline(duckduckgo(subject || q), 2500, null),
  ]);
  if (english) { done(english.text, `wikipedia-en`, english.title); return; }
  if (ddg) { done(ddg.text, 'duckduckgo'); return; }

  // 5. honest fallback — spoken in the farmer's language, never silence
  done(
    pref === 'en'
      ? 'Sorry, I could not find a sure answer for that yet. For government scheme help, call the Kisan Call Centre free on 1800-180-1551.'
      : 'माफ़ कीजिए, इस सवाल का पक्का जवाब अभी नहीं मिला। सरकारी योजनाओं के लिए किसान कॉल सेंटर पर मुफ़्त फोन कीजिए — 1800-180-1551।',
    'none'
  );
}
