const BASE = import.meta.env.VITE_API_URL || '';
export async function api(path, { method = 'GET', body, form } = {}) {
  const res = await fetch(BASE + path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Une erreur est survenue.');
  return data;
}
export const imgs = (p) => (p.images?.length ? p.images : p.image ? [p.image] : []);
// 7 -> "7 DT", 7.5 -> "7.5 DT" (prices and fees can have decimals)
export const tnd = (n) => {
  const x = Number(n);
  return (Number.isInteger(x) ? x.toFixed(0) : x.toFixed(3).replace(/0+$/, '')) + ' DT';
};
export const fmtPhone = (p) => String(p || '').replace(/(\d{2})(\d{3})(\d{3})/, '$1 $2 $3');
export const fmtDate = (d) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
export const STATUS = { new: 'Nouvelle', confirmed: 'Confirmée', shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée' };
export const GOVERNORATES = ['Monastir', 'Tunis', 'Sousse', 'Sfax', 'Mahdia', 'Nabeul', 'Ariana', 'Ben Arous', 'Bizerte', 'Kairouan', 'Autre'];

// Downloads a file from the API (used for the Excel export). The login cookie is sent with the request.
export async function download(path, fallbackName) {
  const res = await fetch(BASE + path, { credentials: 'include' });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || 'Téléchargement impossible.');
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
