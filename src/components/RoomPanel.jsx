import { useState } from 'react';

/**
 * RoomPanel: UI for cloud sync room management.
 * Shown inside SettingsScreen.
 *
 * States:
 * - Not configured: Supabase not set up
 * - No room: Create or join a room
 * - In room: Show code, sync status, leave option
 */
export default function RoomPanel({ sync, t }) {
  const [joinCode, setJoinCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!sync.isConfigured) return null;

  const handleCreate = async () => {
    try {
      await sync.createRoom();
    } catch (err) {
      console.warn('Error creating room:', err);
    }
  };

  const handleJoin = async () => {
    if (joinCode.length < 4) return;
    try {
      await sync.joinRoom(joinCode);
      setJoinCode('');
      setShowJoin(false);
    } catch (err) {
      console.warn('Error joining room:', err);
    }
  };

  const handleShare = async () => {
    const text = `Unite a mi sala en FairScan: ${sync.roomCode}\nhttps://fairscan.app/?room=${sync.roomCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'FairScan - Sala compartida', text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(sync.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const timeSince = (ts) => {
    if (!ts) return null;
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 5) return 'ahora';
    if (s < 60) return `hace ${s}s`;
    if (s < 3600) return `hace ${Math.floor(s / 60)}min`;
    return `hace ${Math.floor(s / 3600)}h`;
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: t.muted, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        ☁️ Sincronización en la nube
      </p>

      {/* ERROR */}
      {sync.error && (
        <div style={{ padding: '8px 12px', borderRadius: 10, background: t.red + '20', border: `1px solid ${t.red}30`, marginBottom: 8 }}>
          <p style={{ fontSize: 12, color: t.red, margin: 0 }}>{sync.error}</p>
          <button onClick={sync.clearError} style={{ fontSize: 11, color: t.red, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textDecoration: 'underline' }}>Cerrar</button>
        </div>
      )}

      {/* IN A ROOM */}
      {sync.roomCode ? (
        <div style={{ background: t.card, borderRadius: 14, border: `1px solid ${t.border}`, padding: '14px 16px' }}>
          {/* Room code display */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 11, color: t.muted, margin: '0 0 2px' }}>Sala</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: t.accent, margin: 0, letterSpacing: '0.15em', fontFamily: 'monospace' }}>
                {sync.roomCode}
              </p>
            </div>
            <button onClick={handleShare} style={{
              padding: '10px 16px', borderRadius: 12, border: 'none',
              background: t.accent, color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {copied ? '✓ Copiado' : '📤 Compartir'}
            </button>
          </div>

          {/* Sync status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: sync.isSyncing ? t.yellow : (sync.isOnline ? t.green : t.red),
              boxShadow: `0 0 6px ${sync.isSyncing ? t.yellow : (sync.isOnline ? t.green : t.red)}`,
            }} />
            <span style={{ fontSize: 12, color: t.muted }}>
              {sync.isSyncing ? 'Sincronizando...' : (sync.isOnline ? 'Conectado' : 'Sin conexión')}
              {sync.lastSyncAt && !sync.isSyncing ? ` · Último sync ${timeSince(sync.lastSyncAt)}` : ''}
            </span>
          </div>

          {/* Leave room */}
          <button onClick={sync.leaveRoom} disabled={sync.isLoading} style={{
            width: '100%', padding: '10px', borderRadius: 10,
            border: `1px solid ${t.border}`, background: 'transparent',
            color: t.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            Salir de la sala
          </button>
        </div>
      ) : (
        /* NOT IN A ROOM */
        <div style={{ background: t.card, borderRadius: 14, border: `1px solid ${t.border}`, padding: '14px 16px' }}>
          <p style={{ fontSize: 12, color: t.muted, margin: '0 0 12px' }}>
            Sincronizá datos entre dispositivos. Compartí una sala con tu equipo para que todos vean lo mismo.
          </p>

          {/* Create room button */}
          <button onClick={handleCreate} disabled={sync.isLoading} style={{
            width: '100%', padding: '12px', borderRadius: 12, border: 'none',
            background: t.accent, color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', marginBottom: 8,
            opacity: sync.isLoading ? 0.6 : 1,
          }}>
            {sync.isLoading ? '⏳ Creando...' : '🔗 Crear sala'}
          </button>

          {/* Join room */}
          {showJoin ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="CODIGO"
                maxLength={6}
                autoFocus
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 10,
                  border: `1.5px solid ${t.accent}`, background: t.surface,
                  color: t.text, fontSize: 16, fontWeight: 700,
                  textAlign: 'center', letterSpacing: '0.2em',
                  fontFamily: 'monospace', outline: 'none',
                }}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
              <button onClick={handleJoin} disabled={joinCode.length < 4 || sync.isLoading} style={{
                padding: '10px 16px', borderRadius: 10, border: 'none',
                background: joinCode.length >= 4 ? t.accent : t.surface,
                color: joinCode.length >= 4 ? '#fff' : t.dim,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>
                {sync.isLoading ? '⏳' : '→'}
              </button>
              <button onClick={() => { setShowJoin(false); setJoinCode(''); }} style={{
                padding: '10px 12px', borderRadius: 10,
                border: `1px solid ${t.border}`, background: t.card,
                color: t.muted, fontSize: 12, cursor: 'pointer',
              }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setShowJoin(true)} style={{
              width: '100%', padding: '10px', borderRadius: 10,
              border: `1px solid ${t.border}`, background: 'transparent',
              color: t.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              Unirse a una sala
            </button>
          )}
        </div>
      )}
    </div>
  );
}
