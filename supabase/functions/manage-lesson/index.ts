import {
  callRpc,
  escapeHtml,
  formatLessonDate,
  isAllowedOrigin,
  sendBrevoEmail,
  supabaseConfig,
} from '../_shared/http.ts';

type Participant = { name: string; email: string };

type LessonChange = {
  action: 'reschedule' | 'cancel';
  lesson_id: string;
  title: string;
  location: string;
  teacher: string;
  old_starts_at: string;
  old_ends_at: string;
  new_starts_at: string;
  new_ends_at: string;
  participants: Participant[];
};

const allowedOrigins = new Set([
  'http://127.0.0.1:4173',
  'http://localhost:4173',
  'https://joga-na-hallu.pages.dev',
  'https://alza-joga-i7pk.vercel.app',
  'https://joganahallu.cz',
  'https://www.joganahallu.cz',
]);

function headers(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : '',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: headers(req) });
}

async function requireAdmin(req: Request): Promise<void> {
  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('UNAUTHORIZED');

  const { url, secretKey } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: secretKey, Authorization: authorization },
  });
  const user = await response.json().catch(() => null);
  if (!response.ok || user?.app_metadata?.role !== 'admin') throw new Error('FORBIDDEN');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(req) });
  if (req.method !== 'POST') return json(req, { error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!isAllowedOrigin(req)) return json(req, { error: 'ORIGIN_NOT_ALLOWED' }, 403);

  let requestedAction = '';
  try {
    await requireAdmin(req);
    const body = await req.json();
    const action = String(body.action ?? '');
    requestedAction = action;
    if (action === 'create') {
      const instructorId = String(body.instructorId ?? '');
      const title = String(body.title ?? '').trim();
      const language = String(body.language ?? 'cs');
      const startsAt = String(body.startsAt ?? '');
      const endsAt = String(body.endsAt ?? '');
      const capacity = Number(body.capacity);
      const repeatCount = Number(body.repeatCount);
      if (!/^[0-9a-f-]{36}$/i.test(instructorId)) throw new Error('INVALID_INSTRUCTOR');
      if (title.length < 2 || title.length > 120) throw new Error('INVALID_TITLE');
      if (!['cs', 'en'].includes(language)) throw new Error('INVALID_LANGUAGE');
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) throw new Error('INVALID_CAPACITY');
      if (!Number.isInteger(repeatCount) || repeatCount < 1 || repeatCount > 52) throw new Error('INVALID_REPEAT_COUNT');
      if (!Number.isFinite(Date.parse(startsAt)) || !Number.isFinite(Date.parse(endsAt)) || Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error('INVALID_TIME');

      const created = await callRpc<{ created: number; lesson_ids: string[] }>('admin_create_lessons', {
        p_title: title,
        p_instructor_id: instructorId,
        p_starts_at: startsAt,
        p_ends_at: endsAt,
        p_capacity: capacity,
        p_language: language,
        p_repeat_count: repeatCount,
      });
      return json(req, { ok: true, action, created: created.created, lessonIds: created.lesson_ids });
    }

    const lessonId = String(body.lessonId ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(lessonId)) throw new Error('INVALID_LESSON');
    if (!['reschedule', 'cancel'].includes(action)) throw new Error('INVALID_ACTION');

    const change = await callRpc<LessonChange>('admin_change_lesson', {
      p_lesson_id: lessonId,
      p_action: action,
      p_starts_at: action === 'reschedule' ? body.startsAt : null,
      p_ends_at: action === 'reschedule' ? body.endsAt : null,
    });

    const teacherFirstName = change.teacher.trim().split(/\s+/)[0] || 'Tým';
    const results = await Promise.all(change.participants.map((participant) => {
      const rescheduled = change.action === 'reschedule';
      const details = rescheduled
        ? `<p>Původní termín: <s>${escapeHtml(formatLessonDate(change.old_starts_at))}</s><br>
          Nový termín: <strong>${escapeHtml(formatLessonDate(change.new_starts_at))}</strong></p>`
        : `<p>Termín: <strong>${escapeHtml(formatLessonDate(change.old_starts_at))}</strong></p>`;
      return sendBrevoEmail({
        toEmail: participant.email,
        toName: participant.name,
        subject: `${rescheduled ? 'Změna času lekce' : 'Lekce zrušena'}: ${change.title}`,
        htmlContent: `<p>Ahoj ${escapeHtml(participant.name)},</p>
          <p>${rescheduled ? 'čas lekce byl změněn' : 'lekce byla zrušena'}: <strong>${escapeHtml(change.title)}</strong>.</p>
          ${details}
          <p>${escapeHtml(change.location)}</p>
          <p>${rescheduled ? 'Těšíme se na podložce.' : 'Omlouváme se za komplikace.'}<br>${escapeHtml(teacherFirstName)} · Jóga na HALLU</p>`,
      });
    }));

    const notified = results.filter((result) => result.sent).length;
    const failed = results.length - notified;
    return json(req, { ok: true, action: change.action, notified, failed });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const status = code === 'UNAUTHORIZED' ? 401 : code === 'FORBIDDEN' ? 403 : code.includes('LESSON_CONFLICT') ? 409 : code.includes('INVALID_') ? 400 : 500;
    console.error('manage-lesson failed', code);
    const message = status === 403
      ? 'Tento účet nemá oprávnění správce.'
      : status === 409
        ? 'Ve zvoleném termínu už má tento lektor naplánovanou lekci.'
        : requestedAction === 'create'
          ? 'Nové lekce se nepodařilo vytvořit.'
          : 'Změnu lekce se nepodařilo uložit.';
    return json(req, { error: code, message }, status);
  }
});
