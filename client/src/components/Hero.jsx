import { useEffect, useState } from 'react';
import { api } from '../api.js';

const FALLBACK = ['/banner.jpg'];

// Rotating header banner. The FIRST image is the main one and stays on screen longer
// (`mainInterval`, default 10 s); the others stay `interval` seconds (default 3 s).
// In the shop it loads its settings from the API; the admin preview passes them as props.
export default function Hero({ images, interval, mainInterval }) {
  const [cfg, setCfg] = useState(null);
  const [st, setSt] = useState({ i: 0, prev: -1 });

  useEffect(() => {
    if (images) return;
    api('/api/settings/hero').then(setCfg).catch(() => setCfg({}));
  }, [images]);

  const configured = images || cfg?.images || [];
  const list = configured.length ? configured : FALLBACK;
  const others = Math.max(2, Number(interval ?? cfg?.interval) || 3);
  const main = Math.max(2, Number(mainInterval ?? cfg?.mainInterval) || 10);
  const { i, prev } = st;

  useEffect(() => { setSt({ i: 0, prev: -1 }); }, [list.length]);
  useEffect(() => {
    if (list.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => setSt((s) => ({ i: (s.i + 1) % list.length, prev: s.i })), (i === 0 ? main : others) * 1000);
    return () => clearTimeout(t);
  }, [list.length, main, others, i]);

  if (!images && !cfg) return <section className="hero" />; // keeps the space while settings load

  return (
    <section className="hero" style={{ '--fade': Math.min(1.8, Math.min(main, others) / 2) + 's' }}>
      {list.map((u, k) => (
        <img key={k + u} className={'slide' + (k === i ? ' on' : k === prev ? ' prev' : '')} src={u}
          alt={k === 0 ? "Novaro, L'Art du Parfum. Une fragrance, une émotion." : ''} aria-hidden={k !== i} />
      ))}
    </section>
  );
}
