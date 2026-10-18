const LEGACY_HOSTNAME = 'joga-na-hallu.pages.dev';
const WWW_HOSTNAME = 'www.joganahallu.cz';
const CANONICAL_ORIGIN = 'https://joganahallu.cz';

export async function onRequest(context) {
  const url = new URL(context.request.url);

  const cleanPathname = url.pathname.endsWith('.html')
    ? url.pathname.slice(0, -5)
    : url.pathname;

  if (url.hostname === LEGACY_HOSTNAME || url.hostname === WWW_HOSTNAME || cleanPathname !== url.pathname) {
    return Response.redirect(`${CANONICAL_ORIGIN}${cleanPathname || '/'}${url.search}`, 301);
  }

  return context.next();
}
