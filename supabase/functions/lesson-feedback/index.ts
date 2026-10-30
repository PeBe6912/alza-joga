import { callRpc, corsHeaders, isAllowedOrigin, json } from '../_shared/http.ts';

const ALLOWED_TOPICS = new Set([
  'Tempo lekce',
  'Náročnost',
  'Vysvětlení pozic',
  'Skladba lekce',
  'Dopomoci',
  'Atmosféra',
  'Hudba',
  'Organizace',
  'Tempo lekce: Pomalé',
  'Tempo lekce: Akorát',
  'Tempo lekce: Rychlé',
  'Náročnost: Nízká',
  'Náročnost: Akorát',
  'Náročnost: Vysoká',
  'Vysvětlení pozic: Málo podrobné',
  'Vysvětlení pozic: Srozumitelné',
  'Vysvětlení pozic: Příliš podrobné',
  'Skladba lekce: Málo pestrá',
  'Skladba lekce: Vyhovovala mi',
  'Skladba lekce: Příliš střídání',
  'Dopomoci: Uvítám více',
  'Dopomoci: Vyhovovaly mi',
  'Dopomoci: Raději bez nich',
  'Atmosféra: Příjemná',
  'Atmosféra: Neutrální',
  'Atmosféra: Nepříjemná',
  'Hudba: Vyhovovala mi',
  'Hudba: Rušila mě',
  'Hudba: Raději bez ní',
  'Organizace: Bez problémů',
  'Organizace: Drobné zádrhele',
  'Organizace: Větší problémy',
]);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!isAllowedOrigin(req)) return json(req, { error: 'ORIGIN_NOT_ALLOWED' }, 403);

  try {
    const body = await req.json();
    const action = String(body.action ?? '');
    const token = String(body.token ?? '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
      throw new Error('INVALID_FEEDBACK_LINK');
    }

    if (action === 'load') {
      const feedback = await callRpc<Record<string, unknown>>('feedback_form', { p_token: token });
      return json(req, { ok: true, ...feedback });
    }

    if (action === 'submit') {
      const rating = String(body.rating ?? '');
      const topics = Array.isArray(body.topics) ? [...new Set(body.topics.map((topic: unknown) => String(topic)))] : [];
      const comment = String(body.comment ?? '').trim();
      if (!['great', 'good', 'not_right'].includes(rating)
        || topics.length > 8
        || new Set(topics.map((topic) => topic.split(': ')[0])).size !== topics.length
        || topics.some((topic) => !ALLOWED_TOPICS.has(topic))
        || comment.length > 1500) {
        throw new Error('INVALID_FEEDBACK');
      }
      await callRpc('submit_lesson_feedback', {
        p_token: token,
        p_rating: rating,
        p_topics: topics,
        p_comment: comment,
      });
      return json(req, { ok: true, submitted: true });
    }

    throw new Error('INVALID_ACTION');
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const unavailable = code.includes('FEEDBACK_NOT_AVAILABLE');
    const invalid = code.includes('INVALID_');
    console.error('lesson-feedback failed', code);
    return json(req, {
      error: code,
      message: unavailable
        ? 'Tento odkaz pro zpětnou vazbu není dostupný nebo už vypršel.'
        : invalid
          ? 'Zkontroluj prosím vyplněnou zpětnou vazbu.'
          : 'Zpětnou vazbu se nepodařilo uložit. Zkus to prosím znovu.',
    }, unavailable ? 404 : invalid ? 400 : 500);
  }
});
