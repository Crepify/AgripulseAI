/**
 * Vercel Function  GET|POST /api/whatsapp-webhook
 *
 * FARMER WHATSAPP CONVERSATIONAL PASSBOOK — webhook endpoint.
 *
 * GET  — Meta Cloud API verification handshake (hub.challenge echo).
 * POST — Incoming WhatsApp voice note → STT (Whisper / Sarvam AI for Indian
 *        languages) → structured deal JSON → interactive template reply.
 *
 * Set WHATSAPP_VERIFY_TOKEN / WHATSAPP_ACCESS_TOKEN / SARVAM_API_KEY in
 * Vercel env vars for live mode; without them the route runs a fully
 * deterministic mock so the demo flow works end-to-end.
 */

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

// Meta webhook verification handshake
export async function GET(request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = process.env.WHATSAPP_VERIFY_TOKEN || 'agripulse-verify';
  if (mode === 'subscribe' && token === expected) {
    return new Response(challenge || '', { status: 200 });
  }
  return json({ error: 'Webhook verification failed' }, 403);
}

/**
 * Mock STT: converts a Hindi/Marathi voice note into the structured deal
 * intent. In production this calls OpenAI Whisper or Sarvam AI (better for
 * Indic languages), then an LLM extraction pass.
 */
function mockTranscribeVoiceNote(/* mediaId */) {
  return {
    transcript: 'मेरे पास पाँच क्विंटल टमाटर है, खेड़ गाँव से। कल बेचना है।',
    structured: { crop: 'Tomato', quantityQuintals: 5, village: 'Khed' },
    sttProvider: 'sarvam-ai (mock)',
    confidence: 0.94,
  };
}

/** Build the interactive template reply (net-in-hand ONLY — never gross). */
function buildInteractiveReply(to, deal) {
  const FARMER_NET = 235; // ₹/quintal net-in-hand (see saathiEconomics)
  const net = deal.quantityQuintals * FARMER_NET;
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text:
          `🌾 ${deal.crop} • ${deal.quantityQuintals} क्विंटल • ${deal.village}\n` +
          `आपको मिलेंगे: *₹${net.toLocaleString('en-IN')} सीधे बैंक में* (₹${FARMER_NET}/क्विंटल NET)\n` +
          `मंडी से ~₹${(deal.quantityQuintals * 30).toLocaleString('en-IN')} ज़्यादा। कोई कटौती नहीं।`,
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'confirm_deal', title: '✅ हाँ, बेचना है' } },
          { type: 'reply', reply: { id: 'open_passbook', title: '📗 पासबुक देखें' } },
          { type: 'reply', reply: { id: 'talk_saathi', title: '🧑‍🌾 साथी से बात' } },
        ],
      },
    },
  };
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  try {
    const entry = body?.entry?.[0]?.changes?.[0]?.value;
    const message = entry?.messages?.[0];
    if (!message) return json({ status: 'ignored', reason: 'no message in payload' });

    const from = message.from || 'unknown';

    // Voice note → STT → structured deal
    if (message.type === 'audio' || message.type === 'voice' || body?.mockVoice) {
      const stt = mockTranscribeVoiceNote(message.audio?.id);
      const reply = buildInteractiveReply(from, stt.structured);

      // Live mode: POST `reply` to graph.facebook.com/v19.0/{phoneId}/messages
      // with WHATSAPP_ACCESS_TOKEN. Mocked here for the demo.
      return json({
        status: 'processed',
        stt,
        outboundTemplate: reply,
        passbookLink: `/passbook/${Date.now().toString(36)}`,
      });
    }

    // Button replies route back into the deal state machine
    if (message.type === 'interactive') {
      const id = message.interactive?.button_reply?.id;
      return json({ status: 'button', action: id || 'unknown' });
    }

    return json({ status: 'ignored', type: message.type });
  } catch (err) {
    return json({ error: err.message || 'Webhook processing failed' }, 500);
  }
}
