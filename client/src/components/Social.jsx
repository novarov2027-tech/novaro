import { useEffect, useState } from 'react';
import { api } from '../api.js';

// Footer icons. Only the links filled in by the owner are shown.
// In the shop it loads them from the API; the admin preview passes `links` directly.
const ICONS = {
  facebook: <path fill="currentColor" d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />,
  instagram: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
    </g>
  ),
  whatsapp: <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />,
};
const LABEL = { facebook: 'Facebook', instagram: 'Instagram', whatsapp: 'WhatsApp' };

export default function Social({ links }) {
  const [cfg, setCfg] = useState(null);
  useEffect(() => {
    if (links) return;
    api('/api/settings/social').then(setCfg).catch(() => setCfg({}));
  }, [links]);

  const data = links || cfg || {};
  const href = {
    facebook: data.facebook,
    instagram: data.instagram,
    whatsapp: data.whatsapp ? `https://wa.me/${data.whatsapp}` : '',
  };
  const shown = Object.keys(ICONS).filter((k) => href[k]);
  if (!shown.length) return null;
  const n = data.whatsapp || '';
  const pretty = n.startsWith('216') && n.length === 11 ? `+216 ${n.slice(3, 5)} ${n.slice(5, 8)} ${n.slice(8)}` : `+${n}`;
  return (
    <>
      <div className="social">
        {shown.map((k) => (
          <a key={k} href={href[k]} target="_blank" rel="noopener noreferrer" aria-label={LABEL[k]} title={LABEL[k]}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[k]}</svg>
          </a>
        ))}
      </div>
      {n && <p className="wa">WhatsApp : <a href={href.whatsapp} target="_blank" rel="noopener noreferrer">{pretty}</a></p>}
    </>
  );
}
