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
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: t.bg,
      color: t.text,
      padding: 24,
      position: 'relative',
    }}>
      {onCancel && !convertir && (
        <button type="button" onClick={onCancel} aria-label="Volver" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 14, width: 48, height: 48, borderRadius: 24, border: 'none', background: t.surface, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <Icono nombre="volver" tamano={22} color={t.text} />
        </button>
      )}
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* La marca */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: t.text, margin: '0 0 6px', letterSpacing: '-0.02em' }}>FairScan</h1>
          <p style={{ fontSize: 15, color: t.muted, margin: 0 }}>
            {mode === 'login' ? 'Entrar con tu cuenta' : convertir ? 'Creá tu cuenta para no perder tu catálogo' : 'Creá tu cuenta'}
          </p>
          <p style={{ fontSize: 14, color: t.muted, margin: '12px 0 0', lineHeight: 1.45 }}>Sacá la foto. La app le pone nombre, lee la tarjeta y arma el pedido.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && (
            <>
              <input
                type="text"
                placeholder="Tu nombre"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                style={inputStyle}
                autoComplete="name"
              />
              <input
                type="text"
                placeholder="Nombre de tu equipo"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                style={inputStyle}
              />
            </>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
            autoComplete="email"
          />
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ ...inputStyle, paddingRight: 48 }}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                padding: 4,
                cursor: 'pointer',
                fontSize: 18,
                color: t.muted,
                display: 'flex',
                alignItems: 'center',
              }}
              tabIndex={-1}
            >
              <Icono nombre={showPassword ? 'ojoCerrado' : 'ojo'} tamano={20} color={t.muted} />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: t.redSoft,
              border: `1px solid ${t.red}30`,
            }}>
              <p style={{ fontSize: 13, color: t.red, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: t.greenSoft,
              border: `1px solid ${t.green}30`,
            }}>
              <p style={{ fontSize: 13, color: t.green, margin: 0 }}>{success}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 14,
              border: 'none',
              background: loading ? t.muted : t.accent,
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'default' : 'pointer',
              marginTop: 4,
            }}
          >
            {loading
              ? 'Entrando…'
              : mode === 'login'
                ? 'Entrar'
                : 'Crear cuenta'
            }
          </button>
        </form>

        {/* Consentimiento (pieza 1.15). Casilla desmarcada por defecto y texto fijo
            con links absolutos: en la app nativa un link relativo no lleva a ningún lado. */}
        {mode === 'register' && (
          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={e => setMarketingOptIn(e.target.checked)}
                style={{ width: 18, height: 18, margin: '1px 0 0', accentColor: t.accent, flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: t.text, lineHeight: 1.5 }}>
                Quiero recibir novedades de FairScan por mail. Me puedo dar de baja con un clic.
              </span>
            </label>
            <p style={{ fontSize: 12, color: t.muted, margin: '12px 0 0', lineHeight: 1.6 }}>
              Al crear la cuenta aceptás los{' '}
              <a href="https://fairscan.app/terminos" target="_blank" rel="noopener" style={{ color: t.accent, fontWeight: 600 }}>Términos y Condiciones</a>
              {' '}y la{' '}
              <a href="https://fairscan.app/privacidad" target="_blank" rel="noopener" style={{ color: t.accent, fontWeight: 600 }}>Política de Privacidad</a>.
            </p>
          </div>
        )}

        {convertir && (
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: t.muted }}>
            Lo que capturaste queda en esta cuenta. <button onClick={onCancel} style={{ background: 'none', border: 'none', color: t.accent, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>Ahora no</button>
          </p>
        )}
        {/* Toggle mode */}
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: t.muted }}>
          {mode === 'login' ? '¿No tenés cuenta? ' : '¿Ya tenés cuenta? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); setSuccess(null); }}
            style={{
              background: 'none',
              border: 'none',
              color: t.accent,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {mode === 'login' ? 'Crear cuenta' : 'Entrar'}
          </button>
        </p>
        {mode === 'login' && (
          <p style={{ textAlign: 'center', margin: '8px 0 0' }}>
            <button type="button" onClick={olvide} style={{ background: 'none', border: 'none', color: t.text, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 8, fontFamily: 'inherit' }}>Olvidé mi contraseña</button>
          </p>
        )}
        {aviso && <p style={{ textAlign: 'center', fontSize: 13, color: t.muted, margin: '8px 0 0', lineHeight: 1.4 }}>{aviso}</p>}
      </div>
    </div>
  );
}
