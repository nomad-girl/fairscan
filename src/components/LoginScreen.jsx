import { useState } from 'react';

/**
 * `convertir`: la usuaria ya está adentro con una sesión anónima (4.2) y quiere
 * ponerle mail y contraseña. Mismo formulario de registro, pero la cuenta no se
 * crea: se completa la que ya tiene, y el catálogo queda donde está.
 */
export default function LoginScreen({ t, onAuth, convertir = false, onCancel }) {
  const [mode, setMode] = useState(convertir ? 'register' : 'login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  // Novedades por mail: desmarcada por defecto (decisión legal 08/09).
  const [marketingOptIn, setMarketingOptIn] = useState(false);

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
          ? await onAuth.convertir(email, password, displayName || email.split('@')[0], teamName, marketingOptIn)
          : await onAuth.signUp(email, password, displayName || email.split('@')[0], teamName, marketingOptIn);
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
    border: `1.5px solid ${t.border}`,
    background: t.surface,
    color: t.text,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: t.bg,
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <span style={{ fontSize: 48 }}>📸</span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: t.text, margin: '8px 0 4px' }}>FairScan</h1>
          <p style={{ fontSize: 13, color: t.muted, margin: 0 }}>
            {mode === 'login' ? 'Iniciá sesión para continuar' : convertir ? 'Creá tu cuenta para no perder tu catálogo' : 'Creá tu cuenta'}
          </p>
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
              {showPassword ? '🙈' : '👁️'}
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
              ? '⏳ Cargando...'
              : mode === 'login'
                ? 'Iniciar sesión'
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
            {mode === 'login' ? 'Crear cuenta' : 'Iniciar sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}
