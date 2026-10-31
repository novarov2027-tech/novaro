import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// One login page for everyone. Customers: username + password.
// The owner: username, then a 6-digit code sent to his email.
export default function Login() {
  const { user, start, login, verify, register } = useAuth();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [mode, setMode] = useState('login'); // login | reg
  const [step, setStep] = useState('user'); // user | password | code
  const [f, setF] = useState({ username: '', password: '', code: '' });
  const [hint, setHint] = useState('');
  const [info, setInfo] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const done = (u) => nav(u.role === 'owner' ? '/admin' : params.get('next') || '/', { replace: true });
  useEffect(() => { if (user) done(user); }, [user]); // eslint-disable-line

  const run = (fn) => async (e) => {
    e?.preventDefault(); setErr(''); setBusy(true);
    try { await fn(); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const switchMode = (m) => { setMode(m); setStep('user'); setErr(''); setInfo(''); setF({ username: '', password: '', code: '' }); };

  const onStart = run(async () => {
    const r = await start(f.username);
    setHint(r.hint || '');
    setInfo(r.alreadySent ? 'Un code vient déjà d’être envoyé. Utilisez-le ou patientez une minute avant d’en demander un autre.' : '');
    setStep(r.method);
  });
  const onPassword = run(async () => done(await login(f.username, f.password)));
  const onCode = run(async () => done(await verify(f.username, f.code)));
  const onReg = run(async () => done(await register(f.username, f.password)));

  const Err = () => <div className="err">{err}</div>;
  const ChangeUser = () => <button type="button" className="lnk" style={{ padding: 0 }} onClick={() => { setStep('user'); setErr(''); setInfo(''); }}>Changer d’identifiant</button>;

  return (
    <div className="page"><div className="modal narrow" style={{ margin: '0 auto' }}><div className="body">
      <div className="tabs" role="tablist">
        <button className="tab" role="tab" aria-selected={mode === 'login'} onClick={() => switchMode('login')}>Connexion</button>
        <button className="tab" role="tab" aria-selected={mode === 'reg'} onClick={() => switchMode('reg')}>Créer un compte</button>
      </div>
      <p style={{ color: 'var(--mute)', margin: '0 0 6px' }}>
        {params.get('next') === '/checkout' ? 'Connectez-vous pour finaliser votre commande.' : 'Accédez à vos commandes et commandez en quelques clics.'}
      </p>

      {mode === 'reg' && (
        <form onSubmit={onReg}>
          <label htmlFor="ru">Identifiant</label>
          <input id="ru" autoComplete="username" autoCapitalize="none" value={f.username} onChange={set('username')} />
          <small style={{ color: 'var(--mute)' }}>3 à 20 caractères : lettres, chiffres, point, tiret ou underscore.</small>
          <label htmlFor="rp">Mot de passe</label>
          <input id="rp" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} />
          <Err />
          <button className="btn" style={{ width: '100%', marginTop: 8 }} disabled={busy}>Créer mon compte</button>
        </form>
      )}

      {mode === 'login' && step === 'user' && (
        <form onSubmit={onStart}>
          <label htmlFor="lu">Identifiant</label>
          <input id="lu" autoComplete="username" autoCapitalize="none" autoFocus value={f.username} onChange={set('username')} />
          <Err />
          <button className="btn" style={{ width: '100%', marginTop: 8 }} disabled={busy || !f.username.trim()}>Continuer</button>
        </form>
      )}

      {mode === 'login' && step === 'password' && (
        <form onSubmit={onPassword}>
          <p style={{ margin: '14px 0 0' }}><b>{f.username}</b> · <ChangeUser /></p>
          <label htmlFor="lp">Mot de passe</label>
          <input id="lp" type="password" autoComplete="current-password" autoFocus value={f.password} onChange={set('password')} />
          <Err />
          <button className="btn" style={{ width: '100%', marginTop: 8 }} disabled={busy}>Se connecter</button>
        </form>
      )}

      {mode === 'login' && step === 'code' && (
        <form onSubmit={onCode}>
          <p style={{ margin: '14px 0 0' }}><b>{f.username}</b> · <ChangeUser /></p>
          <p style={{ color: 'var(--mute)', margin: '8px 0 0' }}>
            Un code à 6 chiffres a été envoyé à <b style={{ color: 'var(--ivory)' }}>{hint}</b>. Il est valable 10 minutes.
          </p>
          {info && <p style={{ color: 'var(--gold2)', margin: '8px 0 0' }}>{info}</p>}
          <label htmlFor="lc">Code de connexion</label>
          <input id="lc" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus placeholder="123456"
            style={{ letterSpacing: 6, fontSize: 20 }} value={f.code} onChange={set('code')} />
          <Err />
          <button className="btn" style={{ width: '100%', marginTop: 8 }} disabled={busy || f.code.replace(/\D/g, '').length !== 6}>Valider</button>
          <p style={{ textAlign: 'center', margin: '14px 0 0' }}>
            <button type="button" className="lnk" onClick={onStart}>Renvoyer le code</button>
          </p>
        </form>
      )}
    </div></div></div>
  );
}
