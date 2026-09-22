import { Icono } from '../componentes/Icono.jsx';
import { useState } from 'react';
import { listaDeRubros, RUBRO_POR_DEFECTO } from '../lib/presets.js';

/**
 * `convertir`: la usuaria ya está adentro con una sesión anónima (4.2) y quiere
 * ponerle mail y contraseña. Mismo formulario de registro, pero la cuenta no se
 * crea: se completa la que ya tiene, y el catálogo queda donde está.
 */
export default function LoginScreen({ t: tTema, onAuth, convertir = false, onCancel }) {
  const t = tTema; // tema claro: el oscuro liso quedó vacío (Nati, 22/09: "toda oscura, no dice nada")
  const [mode, setMode] = useState(convertir ? 'register' : 'login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [aviso, setAviso] = useState('');
  const recuperando = !!onAuth?.recuperando;
  const olvide = async () => {
    if (!email.trim()) { setAviso('Escribí tu mail arriba y volvé a tocar acá.'); return; }
    try { await onAuth.recuperar(email.trim()); setAviso('Te mandamos un mail para crear una contraseña nueva. Revisá también no deseados.'); }
    catch (e) { setAviso(e?.message || 'No se pudo mandar el mail.'); }
  };
  const [displayName, setDisplayName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
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
        if (convertir) { onCancel?.(); setLoading(false); return; }
        // If email confirmation is required, show message
        if (result?.user && !result.session) {
          setSuccess('Revisá tu email para confirmar la cuenta');
          setMode('login');
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      const msg = err.message || 'Error desconocido';
      if (msg.includes('Invalid login')) setError('Email o contraseña incorrectos');
      else if (msg.includes('Email not confirmed')) setError('Confirmá tu email antes de ingresar');
      else if (msg.includes('User already registered')) setError('Este email ya está registrado');
      else if (msg.includes('no autorizado') || msg.includes('not allowed') || msg.includes('Signups not allowed')) setError('Este email no está autorizado');
      else if (msg.includes('Password should be')) setError('La contraseña debe tener al menos 6 caracteres');
      else setError(msg);
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
        <form onSubmit={async (e) => { e.preventDefault(); if (nueva.length < 6) { setAviso('La contraseña tiene que tener al menos 6 caracteres.'); return; } try { await onAuth.cambiarContrasena(nueva); setAviso(''); } catch (err) { setAviso(err?.message || 'No se pudo cambiar.'); } }} style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: t.text, margin: 0 }}>Nueva contraseña</h1>
          <p style={{ fontSize: 14, color: t.muted, margin: 0 }}>Elegí una contraseña nueva para tu cuenta de FairScan.</p>
          <input type="password" placeholder="Nueva contraseña" value={nueva} onChange={e => setNueva(e.target.value)} autoComplete="new-password" style={inputStyle} />
          <button type="submit" style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: t.accent, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Guardar y entrar</button>
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
      <div style={{ position: 'relative', background: '#EA5A22', color: '#fff', padding: 'calc(env(safe-area-inset-top, 0px) + 68px) 24px 28px', display: 'flex', flexDirection: 'column', gap: 8, borderRadius: '0 0 32px 32px', flexShrink: 0 }}>
        {onCancel && !convertir && (
          <button type="button" onClick={onCancel} aria-label="Volver" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 14, width: 44, height: 44, borderRadius: 22, border: 'none', background: 'rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <Icono nombre="volver" tamano={22} color="#fff" />
          </button>
        )}
        <h1 style={{ fontSize: 36, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>FairScan</h1>
        <p style={{ fontSize: 16, margin: 0, lineHeight: 1.35, color: 'rgba(255,255,255,0.92)', maxWidth: 340 }}>{convertir ? 'Creá tu cuenta para no perder tu catálogo.' : 'Sacá la foto. La app le pone nombre, lee la tarjeta y arma el pedido.'}</p>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 22px calc(28px + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mode === 'register' && (
            <>
              <label style={etiqueta} htmlFor="login-nombre">Tu nombre</label>
              <input id="login-nombre" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} style={campo} autoComplete="name" />
              <label style={etiqueta} htmlFor="login-equipo">Nombre de tu equipo</label>
              <input id="login-equipo" type="text" value={teamName} onChange={e => setTeamName(e.target.value)} style={campo} />
            </>
          )}
          <label style={etiqueta} htmlFor="login-mail">Mail</label>
          <input id="login-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} required style={campo} autoComplete="email" autoCapitalize="none" autoCorrect="off" inputMode="email" />
          <label style={etiqueta} htmlFor="login-pass">Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input id="login-pass" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={{ ...campo, paddingRight: 48 }} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar la contraseña' : 'Ver la contraseña'} tabIndex={-1} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Icono nombre={showPassword ? 'ojoCerrado' : 'ojo'} tamano={20} color={t.muted} />
            </button>
          </div>

          {error && <p style={{ fontSize: 13, color: t.red, margin: 0, padding: '8px 12px', borderRadius: 10, background: t.redSoft }}>{error}</p>}
          {success && <p style={{ fontSize: 13, color: t.green, margin: 0, padding: '8px 12px', borderRadius: 10, background: t.greenSoft }}>{success}</p>}

          <button type="submit" disabled={loading} style={{ width: '100%', minHeight: 54, borderRadius: 14, border: 'none', background: loading ? t.border : '#EA5A22', color: '#fff', fontSize: 16, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
            {loading ? 'Entrando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        {mode === 'register' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: t.text, lineHeight: 1.5 }}>
              <input type="checkbox" checked={marketingOptIn} onChange={e => setMarketingOptIn(e.target.checked)} style={{ width: 18, height: 18, margin: '1px 0 0', accentColor: '#EA5A22', flexShrink: 0 }} />
              <span>Quiero recibir novedades de FairScan por mail. Me puedo dar de baja con un clic.</span>
            </label>
            <p style={{ fontSize: 12, color: t.muted, margin: 0, lineHeight: 1.6 }}>
              Al crear la cuenta aceptás los <a href="https://fairscan.app/terminos" target="_blank" rel="noopener" style={{ color: t.accent, fontWeight: 600 }}>Términos y Condiciones</a> y la <a href="https://fairscan.app/privacidad" target="_blank" rel="noopener" style={{ color: t.accent, fontWeight: 600 }}>Política de Privacidad</a>.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 6 }}>
          {mode === 'login' ? <button type="button" onClick={olvide} style={link}>Olvidé mi contraseña</button> : <span />}
          <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setSuccess(null); }} style={{ ...link, color: t.accent }}>{mode === 'login' ? 'Crear cuenta' : 'Ya tengo cuenta'}</button>
        </div>
        {convertir && <button type="button" onClick={onCancel} style={{ ...link, alignSelf: 'center', marginTop: 4, textDecoration: 'none', color: t.muted }}>Ahora no</button>}
        {aviso && <p style={{ textAlign: 'center', fontSize: 13, color: t.muted, margin: '6px 0 0', lineHeight: 1.4 }}>{aviso}</p>}
      </div>
    </div>
  );
}
