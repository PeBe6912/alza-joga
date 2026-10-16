const ROBOTS = `User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: *
Allow: /

Sitemap: https://joga-na-hallu.pages.dev/sitemap.xml
`;

export function onRequest(context) {
  return new Response(context.request.method === 'HEAD' ? null : ROBOTS, {
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Cache-Control': 'public, max-age=300, s-maxage=900',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
