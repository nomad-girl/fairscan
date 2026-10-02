import { Icono } from '../componentes/Icono.jsx';
import { Marca } from '../componentes/Marca.jsx';
import { MARCA } from '../sistema/tokens.js';
import { useState } from 'react';
import { listaDeRubros, RUBRO_POR_DEFECTO } from '../lib/presets.js';
import { useTranslation, Trans } from 'react-i18next';
import { esCuentaYaExistente, esCancelado } from '../lib/entrarCon.js';

/**
 * `convertir`: la usuaria ya está adentro con una sesión anónima (4.2) y quiere
 * ponerle mail y contraseña. Mismo formulario de registro, pero la cuenta no se
 * crea: se completa la que ya tiene, y el catálogo queda donde está.
 */
export default function LoginScreen({ t: tTema, onAuth, convertir = false, onCancel }) {
  const t = tTema; // tema claro: el oscuro liso quedó vacío (Nati, 22/09: "toda oscura, no dice nada")
  const { t: tx } = useTranslation();
  const [mode, setMode] = useState(convertir ? 'register' : 'login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [aviso, setAviso] = useState('');
  const recuperando = !!onAuth?.recuperando;
  // Olvidé mi contraseña (27/09, Nati: "debería darte solo el campo de mail"): su propia pantalla, con el mail y un botón.
  const [enviado, setEnviado] = useState(false);
  const [confirmando, setConfirmando] = useState(null); // mail pendiente de confirmar tras crear la cuenta (D3)
  const [reenviado, setReenviado] = useState(false);
  const olvide = async (e) => {
    e?.preventDefault?.();
    if (!email.trim()) { setAviso(tx('entrar.escribiTuMail')); return; }
    try { await onAuth.recuperar(email.trim()); setAviso(''); setEnviado(true); }
    catch (err) { setAviso(err?.message || tx('entrar.noSePudoMandarMail')); }
  };
  const [displayName, setDisplayName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  // E11 (02/10): entrar con Apple o Google. En la web redirige; en la app abre el navegador del sistema y vuelve sola.
  const [entrandoCon, setEntrandoCon] = useState(null); // 'apple' | 'google' mientras se espera
  const conProveedor = async (proveedor) => {
    if (!onAuth?.entrarCon) return;
    setError(null); setEntrandoCon(proveedor);
    try { await onAuth.entrarCon(proveedor); }
    catch (err) {
      if (esCancelado(err)) { /* cerró el navegador: nada que decir */ }
      else if (esCuentaYaExistente(err)) setError(tx('entrar.mailYaTieneCuenta'));
      else { console.warn('[entrar con ' + proveedor + ']', err?.message || err); setError(tx('entrar.proveedorFallo')); }
    } finally { setEntrandoCon(null); }
  };
  const botonProveedor = (proveedor, fondo, color, borde, logo) => (
    <button key={proveedor} type="button" onClick={() => conProveedor(proveedor)} disabled={!!entrandoCon} aria-label={tx(proveedor === 'apple' ? 'entrar.conApple' : 'entrar.conGoogle')}
      style={{ width: '100%', minHeight: 52, borderRadius: 14, border: borde, background: fondo, color, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: entrandoCon && entrandoCon !== proveedor ? 0.6 : 1 }}>
      {logo}{entrandoCon === proveedor ? tx('entrar.esperandoProveedor') : tx(proveedor === 'apple' ? 'entrar.conApple' : 'entrar.conGoogle')}
    </button>
  );
  // Logos: Apple en su negro reglamentario; la G de Google en sus cuatro colores sobre blanco (guías de marca de cada uno)
  const logoApple = <svg width="18" height="20" viewBox="0 0 814 1000" aria-hidden="true"><path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>;
  const logoGoogle = <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.2z"/><path fill="#FBBC05" d="M10.5 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>;
  const botonesProveedor = onAuth?.entrarCon ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
      {botonProveedor('apple', '#000000', '#FFFFFF', 'none', logoApple)}
      {botonProveedor('google', '#FFFFFF', '#1F1F1F', `1px solid ${t.border}`, logoGoogle)}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: t.dim, fontSize: 12, marginTop: 2 }}>
        <span style={{ flex: 1, height: 1, background: t.border }} /><span>{tx('entrar.oConTuMail')}</span><span style={{ flex: 1, height: 1, background: t.border }} />
      </div>
    </div>
  ) : null;
  // Novedades por mail: desmarcada por defecto (decisión legal 08/09).
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  // Rubro: se pregunta una sola vez, acá, y define las etiquetas que va a ver (4.7).
  const [rubro, setRubro] = useState(RUBRO_POR_DEFECTO);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await onAuth.signIn(email, password);
      } else {
        const result = convertir
          ? await onAuth.convertir(email, password, displayName || email.split('@')[0], teamName, marketingOptIn, rubro)
          : await onAuth.signUp(email, password, displayName || email.split('@')[0], teamName, marketingOptIn, rubro);
        if (convertir) {
          // D3 (27/09): con Confirm email, la cuenta sigue anónima hasta que toque el enlace del mail; hay que decírselo
          const pendiente = result?.user?.new_email || (result?.user?.is_anonymous ? email : null);
          if (pendiente) { setConfirmando(pendiente); setLoading(false); return; }
          onCancel?.(); setLoading(false); return;
        }
        // If email confirmation is required, show message
        if (result?.user && !result.session) {
          setSuccess(tx('entrar.revisaTuEmail'));
          setMode('login');
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      const msg = err.message || tx('entrar.errorDesconocido');
      if (msg.includes('Invalid login')) setError(tx('entrar.credencialesIncorrectas'));
      else if (msg.includes('Email not confirmed')) setError(tx('entrar.confirmaTuEmail'));
      else if (msg.includes('User already registered')) setError(tx('entrar.emailRegistrado'));
      else if (msg.includes('no autorizado') || msg.includes('not allowed') || msg.includes('Signups not allowed')) setError(tx('entrar.emailNoAutorizado'));
      else if (/weak|easy to guess|pwned|leaked/i.test(msg)) setError(tx('entrar.contrasenaFiltrada'));
      else if (/Password should be|at least \d+ characters/i.test(msg)) setError(tx('entrar.contrasenaCorta'));
      else if (/rate limit|too many requests/i.test(msg)) setError(tx('entrar.demasiadosIntentos'));
      else if (/invalid email|Unable to validate email|email address .* invalid/i.test(msg)) setError(tx('entrar.mailInvalido'));
      else if (/network|fetch|Failed to fetch|timeout/i.test(msg)) setError(tx('entrar.sinConexion'));
      else { console.warn('[entrar] error sin traducir:', msg); setError(tx('entrar.errorGenerico')); }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 12,
    border: `1px solid ${t.border}`,
    background: t.surface,
    color: t.text,
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  if (recuperando) {
    const [nueva, setNueva] = [password, setPassword];
    return (
      <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bg, padding: 24 }}>
        <form onSubmit={async (e) => { e.preventDefault(); if (nueva.length < 8) { setAviso(tx('entrar.contrasenaCortaPunto')); return; } try { await onAuth.cambiarContrasena(nueva); setAviso(''); } catch (err) { setAviso(err?.message || tx('entrar.noSePudoCambiar')); } }} style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: t.text, margin: 0 }}>{tx('entrar.nuevaContrasena')}</h1>
          <p style={{ fontSize: 14, color: t.muted, margin: 0 }}>{tx('entrar.nuevaContrasenaPista')}</p>
          <input type="password" placeholder={tx('entrar.nuevaContrasena')} value={nueva} onChange={e => setNueva(e.target.value)} autoComplete="new-password" style={inputStyle} />
          <button type="submit" style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: t.accent, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{tx('entrar.guardarYEntrar')}</button>
          {aviso && <p style={{ fontSize: 13, color: t.red || '#DC2626', margin: 0 }}>{aviso}</p>}
        </form>
      </div>
    );
  }
  // Sin foto (Nati, 22/09: "no es el código visual de la app"): el naranja de la marca arriba con FairScan
  // y la frase; abajo, claro, los campos. El mismo código visual que el resto de la app.
  const campo = {
    width: '100%', boxSizing: 'border-box', minHeight: 52, borderRadius: 14, border: `1px solid ${t.border}`,
    background: t.card, color: t.text, fontFamily: 'inherit', fontSize: 16, padding: '0 14px', outline: 'none',
  };
  const etiqueta = { fontSize: 13, color: t.muted, margin: '0 0 6px', display: 'block' };
  const link = { background: 'none', border: 'none', padding: 0, color: t.text, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 };
  return (
    <div className="pantalla-fija" style={{ position: 'fixed', inset: 0, background: t.bg, color: t.text, fontFamily: 'inherit', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ position: 'relative', background: MARCA.cacao, color: MARCA.crema, padding: 'calc(env(safe-area-inset-top, 0px) + 68px) 24px 28px', display: 'flex', flexDirection: 'column', gap: 8, borderRadius: '0 0 32px 32px', flexShrink: 0 }}>
        {onCancel && !convertir && (
          <button type="button" onClick={onCancel} aria-label={tx('comun.volver')} style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 14, width: 44, height: 44, borderRadius: 22, border: 'none', background: 'rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <Icono nombre="volver" tamano={22} color="#fff" />
          </button>
        )}
        <Marca tamano={36} color={MARCA.crema} conIcono />
        <p style={{ fontSize: 16, margin: 0, lineHeight: 1.35, color: 'rgba(255,243,234,0.88)', maxWidth: 340 }}>{convertir ? tx('entrar.fraseConvertir') : tx('bienvenida.frase')}</p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 22px calc(28px + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {confirmando ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>{tx('entrar.confirmaTitulo')}</h2>
            <p style={{ fontSize: 15, color: t.text, margin: 0, lineHeight: 1.5, padding: '12px 14px', borderRadius: 12, background: t.greenSoft }}>{tx('entrar.confirmaTexto', { mail: confirmando })}</p>
            {reenviado && <p style={{ fontSize: 13, color: t.muted, margin: 0 }}>{tx('entrar.reenviado')}</p>}
            <button type="button" onClick={async () => { try { await onAuth.reenviar?.(confirmando); setReenviado(true); } catch (err) { setError(err?.message || ''); } }} style={{ width: '100%', minHeight: 54, borderRadius: 14, border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{tx('entrar.reenviar')}</button>
            <button type="button" onClick={() => { setConfirmando(null); onCancel?.(); }} style={{ width: '100%', minHeight: 54, borderRadius: 14, border: 'none', background: MARCA.naranja, color: MARCA.cacao, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{tx('entrar.yaConfirme')}</button>
          </div>
        ) : mode === 'recuperar' ? (
          <form onSubmit={olvide} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>{tx('entrar.recuperarContrasena')}</h2>
            {enviado ? (
              <>
                <p style={{ fontSize: 15, color: t.text, margin: 0, lineHeight: 1.5, padding: '12px 14px', borderRadius: 12, background: t.greenSoft }}><Trans i18nKey="entrar.enlaceEnviado" values={{ email: email.trim() }} components={{ b: <b /> }} /></p>
                <button type="button" onClick={() => { setMode('login'); setEnviado(false); setAviso(''); }} style={{ width: '100%', minHeight: 54, borderRadius: 14, border: 'none', background: MARCA.naranja, color: MARCA.cacao, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>{tx('entrar.volverAEntrar')}</button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 14, color: t.muted, margin: '0 0 6px', lineHeight: 1.5 }}>{tx('entrar.recuperarPista')}</p>
                <label style={etiqueta} htmlFor="recuperar-mail">{tx('entrar.mail')}</label>
                <input id="recuperar-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus style={campo} autoComplete="email" autoCapitalize="none" autoCorrect="off" inputMode="email" />
                {aviso && <p style={{ fontSize: 13, color: t.red, margin: 0, padding: '8px 12px', borderRadius: 10, background: t.redSoft }}>{aviso}</p>}
                <button type="submit" style={{ width: '100%', minHeight: 54, borderRadius: 14, border: 'none', background: MARCA.naranja, color: MARCA.cacao, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>{tx('entrar.mandarmeElEnlace')}</button>
                <button type="button" onClick={() => { setMode('login'); setAviso(''); }} style={{ ...link, alignSelf: 'center', marginTop: 8, textDecoration: 'none', color: t.muted }}>{tx('comun.volver')}</button>
              </>
            )}
          </form>
        ) : (<>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 12px' }}>{mode === 'login' ? tx('entrar.entrar') : tx('entrar.crearCuenta')}</h2>
        {botonesProveedor}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mode === 'register' && (
            <>
              <label style={etiqueta} htmlFor="login-nombre">{tx('entrar.tuNombre')}</label>
              <input id="login-nombre" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} style={campo} autoComplete="name" />
              <label style={etiqueta} htmlFor="login-equipo">{tx('entrar.nombreDeEquipo')}</label>
              <input id="login-equipo" type="text" value={teamName} onChange={e => setTeamName(e.target.value)} style={campo} />
            </>
          )}
          <label style={etiqueta} htmlFor="login-mail">{tx('entrar.mail')}</label>
          <input id="login-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} required style={campo} autoComplete="email" autoCapitalize="none" autoCorrect="off" inputMode="email" />
          <label style={etiqueta} htmlFor="login-pass">{tx('entrar.contrasena')}</label>
          <div style={{ position: 'relative' }}>
            <input id="login-pass" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} style={{ ...campo, paddingRight: 48 }} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? tx('entrar.ocultarContrasena') : tx('entrar.verContrasena')} tabIndex={-1} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Icono nombre={showPassword ? 'ojoCerrado' : 'ojo'} tamano={20} color={t.muted} />
            </button>
          </div>
          {/* E10 (Nati, 29/09): mínimo 8, sin reglas de símbolos; la ayuda se ve antes de escribir */}
          {mode === 'register' && <p style={{ fontSize: 12, color: t.dim, margin: '-4px 0 0', lineHeight: 1.5 }}>{tx('entrar.contrasenaPista')}</p>}

          {error && <p style={{ fontSize: 13, color: t.red, margin: 0, padding: '8px 12px', borderRadius: 10, background: t.redSoft }}>{error}</p>}
          {success && <p style={{ fontSize: 13, color: t.green, margin: 0, padding: '8px 12px', borderRadius: 10, background: t.greenSoft }}>{success}</p>}

          <button type="submit" disabled={loading} style={{ width: '100%', minHeight: 54, borderRadius: 14, border: 'none', background: loading ? t.border : MARCA.naranja, color: MARCA.cacao, fontSize: 16, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
            {loading ? tx('entrar.entrando') : mode === 'login' ? tx('entrar.entrar') : tx('entrar.crearCuenta')}
          </button>
        </form>

        {mode === 'register' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: t.text, lineHeight: 1.5 }}>
              <input type="checkbox" checked={marketingOptIn} onChange={e => setMarketingOptIn(e.target.checked)} style={{ width: 18, height: 18, margin: '1px 0 0', accentColor: MARCA.naranja, flexShrink: 0 }} />
              <span>{tx('entrar.novedades')}</span>
            </label>
            <p style={{ fontSize: 12, color: t.muted, margin: 0, lineHeight: 1.6 }}>
              <Trans i18nKey="entrar.aceptasTerminos" components={{ terminos: <a href="https://fairscan.app/terminos" target="_blank" rel="noopener" style={{ color: t.accent, fontWeight: 600 }} />, privacidad: <a href="https://fairscan.app/privacidad" target="_blank" rel="noopener" style={{ color: t.accent, fontWeight: 600 }} /> }} />
            </p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 6 }}>
          {mode === 'login' ? <button type="button" onClick={() => { setMode('recuperar'); setAviso(''); setError(null); }} style={link}>{tx('entrar.olvideContrasena')}</button> : <span />}
          <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setSuccess(null); }} style={{ ...link, color: t.accent }}>{mode === 'login' ? tx('entrar.crearCuenta') : tx('entrar.yaTengoCuenta')}</button>
        </div>
        {convertir && <button type="button" onClick={onCancel} style={{ ...link, alignSelf: 'center', marginTop: 4, textDecoration: 'none', color: t.muted }}>{tx('entrar.ahoraNo')}</button>}
        {aviso && <p style={{ textAlign: 'center', fontSize: 13, color: t.muted, margin: '6px 0 0', lineHeight: 1.4 }}>{aviso}</p>}
        </>)}
      </div>
    </div>
  );
}
