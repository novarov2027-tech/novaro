import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminLogin() {
  const { start, verify } = useAuth();
  const [step, setStep] = useState('user'); // user | code
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const run = (fn) => async (e) => {
    e?.preventDefault(); setErr(''); setBusy(true);
    try { await fn(); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const send = run(async () => { await start(username); setStep('code'); });
  const check = run(async () => { await verify(username, code); });

  return (
    <div className="page"><div className="modal narrow" style={{ margin: '0 auto' }}><div className="body">
      <div style={{ textAlign: 'center' }}><img className="blend" src="/mono.jpg" alt="" style={{ width: 64, margin: '0 auto 6px' }} /></div>
      <h3 style={{ textAlign: 'center' }}>Espace propriétaire</h3>

      {step === 'user' && (
        <form onSubmit={send}>
          <label htmlFor="au">Identifiant</label>
          <input id="au" autoComplete="username" autoCapitalize="none" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
          <div className="err">{err}</div>
          <button className="btn" style={{ width: '100%', marginTop: 8 }} disabled={busy || !username.trim()}>Recevoir mon code</button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={check}>
          <p style={{ color: 'var(--mute)', margin: '0 0 4px' }}>
            Si l’identifiant est correct, un code à 6 chiffres vient d’être envoyé à l’adresse email du propriétaire. Il est valable 10 minutes.
          </p>
          <label htmlFor="ac">Code de connexion</label>
          <input id="ac" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus placeholder="123456"
            style={{ letterSpacing: 6, fontSize: 20 }} value={code} onChange={(e) => setCode(e.target.value)} />
          <div className="err">{err}</div>
          <button className="btn" style={{ width: '100%', marginTop: 8 }} disabled={busy || code.replace(/\D/g, '').length !== 6}>Valider</button>
          <p style={{ textAlign: 'center', margin: '14px 0 0' }}>
            <button type="button" className="lnk" onClick={send}>Renvoyer le code</button>{' · '}
            <button type="button" className="lnk" onClick={() => { setStep('user'); setErr(''); setCode(''); }}>Changer d’identifiant</button>
          </p>
        </form>
      )}
      <p style={{ textAlign: 'center', margin: '18px 0 0' }}><Link className="lnk" to="/">Retour à la boutique</Link></p>
    </div></div></div>
  );
}
