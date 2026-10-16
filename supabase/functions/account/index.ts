import {
  authenticatedUser,
  callRpc,
  corsHeaders,
  czechSalutation,
  escapeHtml,
  formatLessonDate,
  isAllowedOrigin,
  json,
  sendBrevoEmail,
  sha256,
  supabaseConfig,
} from '../_shared/http.ts';

type Dashboard = {
  profile: { fullName: string; relation: 'employee' | 'guest' } | null;
  reservations: Array<{
    id: string;
    status: string;
    title: string;
    startsAt: string;
    endsAt: string;
    cancelBefore: string;
    teacher: string;
    location: string;
    paymentMode: string;
    priceCzk: number | null;
    paymentNote: string;
    paymentQrUrl: string | null;
  }>;
};

type Cancellation = {
  already_cancelled: boolean;
  attendee_name: string;
  attendee_email: string;
  title: string;
  starts_at: string;
};

const accountErrors: Record<string, [number, string]> = {
  INVALID_NAME: [400, 'Zkontroluj prosím jméno.'],
  INVALID_RELATION: [400, 'Zvol prosím, zda jdeš jako zaměstnanec nebo host.'],
  ACCOUNT_NOT_FOUND: [404, 'Uživatelský účet se nepodařilo najít.'],
  ACCOUNT_DISABLED: [410, 'Účastnický účet byl smazán.'],
  INCORRECT_PASSWORD: [401, 'Zadané heslo není správné.'],
  RESERVATION_NOT_FOUND: [404, 'Rezervaci se nepodařilo najít.'],
  CANCELLATION_NOT_ALLOWED: [409, 'Tuto rezervaci už není možné zrušit.'],
  CANCELLATION_DEADLINE_PASSED: [409, 'Lhůta pro bezplatné zrušení této rezervace už uplynula.'],
};

function authHeaders(secretKey: string): Record<string, string> {
  return { apikey: secretKey, authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' };
}

function emailButton(url: string, label: string): string {
  return `<p style="margin:28px 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#3e5648;color:#fff;text-decoration:none;font-weight:700">${escapeHtml(label)}</a></p>`;
}

function actionLinkFrom(result: Record<string, unknown>): string {
  const properties = result.properties && typeof result.properties === 'object'
    ? result.properties as Record<string, unknown>
    : {};
  return String(result.action_link ?? properties.action_link ?? '');
}

async function generateLink(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { url, secretKey } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: authHeaders(secretKey),
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(result?.msg || result?.message || 'AUTH_LINK_FAILED'));
  return result;
}

async function updatePassword(userId: string, password: string): Promise<void> {
  const { url, secretKey } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: authHeaders(secretKey),
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(String(result?.msg || result?.message || 'PASSWORD_UPDATE_FAILED'));
  }
}

async function verifyPassword(email: string, password: string, expectedUserId: string): Promise<string> {
  const { url, secretKey } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: authHeaders(secretKey),
    body: JSON.stringify({ email, password }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.user?.id !== expectedUserId || !result?.access_token) {
    throw new Error('INCORRECT_PASSWORD');
  }
  return String(result.access_token);
}

async function revokeVerificationSession(accessToken: string): Promise<void> {
  const { url, secretKey } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/logout?scope=local`, {
    method: 'POST',
    headers: { apikey: secretKey, authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) console.warn('Temporary password-verification session could not be revoked');
}

async function deleteAuthUser(userId: string): Promise<void> {
  const { url, secretKey } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}?should_soft_delete=false`, {
    method: 'DELETE',
    headers: authHeaders(secretKey),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(String(result?.msg || result?.message || 'ACCOUNT_DELETE_FAILED'));
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'METHOD_NOT_ALLOWED' }, 405);
  if (!isAllowedOrigin(req)) return json(req, { error: 'ORIGIN_NOT_ALLOWED' }, 403);

  try {
    const body = await req.json();
    const action = String(body.action ?? '');
    const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://joga-na-hallu.pages.dev').replace(/\/$/, '');

    if (action === 'register' || action === 'recover') {
      const email = String(body.email ?? '').trim().toLowerCase();
      if (email.length > 320 || !email.includes('@')) return json(req, { message: 'Zkontroluj prosím e-mail.' }, 400);
      const allowed = await callRpc<boolean>('account_allow_auth_email', {
        p_email_hash: await sha256(email),
        p_request_type: action === 'register' ? 'signup' : 'recovery',
      });
      if (!allowed) return json(req, { message: 'Zprávu jsme už před chvílí odeslali. Zkus to prosím později.' }, 429);

      if (action === 'register') {
        const fullName = String(body.fullName ?? '').trim();
        const password = String(body.password ?? '');
        const relation = body.relation === 'guest' ? 'guest' : 'employee';
        if (fullName.length < 2 || fullName.length > 120) return json(req, { message: 'Zkontroluj prosím jméno.' }, 400);
        if (password.length < 12) return json(req, { message: 'Heslo musí mít alespoň 12 znaků.' }, 400);
        let result: Record<string, unknown>;
        try {
          result = await generateLink({
            type: 'signup', email, password,
            data: { full_name: fullName, relation },
            redirect_to: `${siteUrl}/?account=confirmed`,
          });
        } catch (error) {
          if (String(error).toLowerCase().includes('already')) {
            return json(req, { ok: true, existing: true, message: 'Účet s tímto e-mailem už existuje. Přihlas se nebo si obnov heslo.' });
          }
          throw error;
        }
        const actionLink = actionLinkFrom(result);
        if (!actionLink) throw new Error('AUTH_LINK_FAILED');
        const emailResult = await sendBrevoEmail({
          toEmail: email,
          toName: fullName,
          subject: 'Potvrď svůj účet | Jóga na HALLU',
          htmlContent: `<p>${escapeHtml(czechSalutation(fullName))},</p><p>děkujeme za vytvoření účtu. Potvrď e-mailovou adresu a potom už budeš rezervovat lekce bez opakovaného vyplňování údajů.</p>${emailButton(actionLink, 'Potvrdit účet')}<p>Pokud jsi účet nevytvářel/a, tuto zprávu můžeš ignorovat.</p>`,
        });
        if (!emailResult.sent) throw new Error(emailResult.error || 'EMAIL_SEND_FAILED');
        return json(req, { ok: true, message: 'Poslali jsme ti e-mail pro potvrzení účtu.' }, 201);
      }

      try {
        const result = await generateLink({ type: 'recovery', email, redirect_to: `${siteUrl}/?account=recovery` });
        const actionLink = actionLinkFrom(result);
        if (actionLink) {
          await sendBrevoEmail({
            toEmail: email,
            toName: email,
            subject: 'Obnova hesla | Jóga na HALLU',
            htmlContent: `<p>Dobrý den,</p><p>požádal/a jsi o nové heslo k účtu Jóga na HALLU.</p>${emailButton(actionLink, 'Nastavit nové heslo')}<p>Pokud jsi o změnu nežádal/a, tuto zprávu můžeš ignorovat.</p>`,
          });
        }
      } catch (error) {
        console.info('Recovery request intentionally returned a generic response', String(error));
      }
      return json(req, { ok: true, message: 'Pokud účet existuje, poslali jsme odkaz pro nastavení nového hesla.' });
    }

    const user = await authenticatedUser(req);
    if (!user) return json(req, { message: 'Přihlášení vypršelo. Přihlas se prosím znovu.' }, 401);
    const metadata = user.user_metadata || {};
    await callRpc('account_prepare_profile', {
      p_user_id: user.id,
      p_email: user.email,
      p_full_name: String(metadata.full_name ?? metadata.name ?? ''),
      p_relation: metadata.relation === 'guest' ? 'guest' : 'employee',
    });

    if (action === 'dashboard') {
      const dashboard = await callRpc<Dashboard>('account_dashboard', { p_user_id: user.id });
      return json(req, { ok: true, email: user.email, ...dashboard });
    }

    if (action === 'update-profile') {
      const profile = await callRpc('account_update_profile', {
        p_user_id: user.id,
        p_full_name: String(body.fullName ?? ''),
        p_relation: body.relation === 'guest' ? 'guest' : 'employee',
      });
      return json(req, { ok: true, profile });
    }

    if (action === 'cancel-reservation') {
      const cancellation = await callRpc<Cancellation>('account_cancel_reservation', {
        p_user_id: user.id,
        p_reservation_id: String(body.reservationId ?? ''),
      });
      if (!cancellation.already_cancelled) {
        await sendBrevoEmail({
          toEmail: cancellation.attendee_email,
          toName: cancellation.attendee_name,
          subject: `Rezervace zrušena: ${cancellation.title}`,
          htmlContent: `<p>${escapeHtml(czechSalutation(cancellation.attendee_name))},</p><p>rezervace na lekci <strong>${escapeHtml(cancellation.title)}</strong> (${escapeHtml(formatLessonDate(cancellation.starts_at))}) byla zrušena.</p><p>Budeme rádi, když si vybereš jiný termín.</p>`,
        });
      }
      return json(req, { ok: true, alreadyCancelled: cancellation.already_cancelled });
    }

    if (action === 'change-password') {
      const password = String(body.password ?? '');
      if (password.length < 12) return json(req, { message: 'Heslo musí mít alespoň 12 znaků.' }, 400);
      await updatePassword(user.id, password);
      await sendBrevoEmail({
        toEmail: user.email,
        toName: String(metadata.full_name ?? user.email),
        subject: 'Heslo bylo změněno | Jóga na HALLU',
        htmlContent: '<p>Dobrý den,</p><p>heslo k tvému účtu Jóga na HALLU bylo právě změněno.</p><p>Pokud jsi změnu neprovedl/a, obrať se prosím co nejdříve na správce webu.</p>',
      });
      return json(req, { ok: true });
    }

    if (action === 'delete-account') {
      const password = String(body.password ?? '');
      if (!password) return json(req, { message: 'Pro smazání účtu zadej své současné heslo.' }, 400);
      const verificationToken = await verifyPassword(user.email, password, user.id);
      await revokeVerificationSession(verificationToken);
      const isAdmin = user.app_metadata?.role === 'admin';
      const dashboard = await callRpc<Dashboard>('account_dashboard', { p_user_id: user.id });
      const fullName = dashboard.profile?.fullName || String(metadata.full_name ?? user.email);

      if (isAdmin) {
        await callRpc('account_delete_participant_profile', { p_user_id: user.id });
      } else {
        await deleteAuthUser(user.id);
      }

      const emailResult = await sendBrevoEmail({
        toEmail: user.email,
        toName: fullName,
        subject: 'Účet byl smazán | Jóga na HALLU',
        htmlContent: isAdmin
          ? `<p>${escapeHtml(czechSalutation(fullName))},</p><p>tvůj účastnický profil na webu Jóga na HALLU byl smazán a dřívější rezervace už nejsou s profilem propojené.</p><p>Administrátorský přístup zůstal zachovaný.</p>`
          : `<p>${escapeHtml(czechSalutation(fullName))},</p><p>tvůj uživatelský účet na webu Jóga na HALLU byl smazán. Dřívější rezervace už nejsou s účtem propojené.</p>`,
      });
      if (!emailResult.sent) console.warn('Account deletion email failed', emailResult.error);

      return json(req, { ok: true, adminAccessPreserved: isAdmin });
    }

    return json(req, { error: 'UNKNOWN_ACTION' }, 400);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const mapped = accountErrors[code];
    console.error('account failed', code);
    return json(req, { error: code, message: mapped?.[1] ?? 'Požadavek se nepodařilo dokončit. Zkus to prosím znovu.' }, mapped?.[0] ?? 500);
  }
});
