const LEGACY_HOSTNAME = 'joga-na-hallu.pages.dev';
const CANONICAL_ORIGIN = 'https://joganahallu.cz';

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === LEGACY_HOSTNAME) {
    return Response.redirect(`${CANONICAL_ORIGIN}${url.pathname}${url.search}`, 301);
  }

  return context.next();
}
