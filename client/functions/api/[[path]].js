// Cloudflare Pages Function: forwards every /api/* request to the Express API (Render).
// The browser only ever talks to the Pages domain, so the login cookie stays first-party
// (works on Safari and phones). Set the API_URL variable in Cloudflare, e.g. https://novaro-api.onrender.com
export async function onRequest({ request, env }) {
  if (!env.API_URL) return new Response(JSON.stringify({ error: 'API_URL is not set' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, env.API_URL);
  const headers = new Headers(request.headers);
  headers.delete('host');
  const res = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  });
  return new Response(res.body, res); // Set-Cookie and status pass straight through
}
