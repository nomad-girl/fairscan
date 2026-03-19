import { useState, useEffect } from 'react';

export default function TeamPanel({ sync, teams, activeTeam, teamMembers, isAdmin, onFetchMembers, onInvite, onSwitchTeam, t }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState(null);
  const [showInvite, setShowInvite] = useState(false);

  // Fetch members when active team changes
  useEffect(() => {
    if (activeTeam?.id && onFetchMembers) {
      onFetchMembers(activeTeam.id);
    }
  }, [activeTeam?.id]);

  if (!sync?.isConfigured) return null;

  const timeSince = (ts) => {
    if (!ts) return null;
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 5) return 'ahora';
    if (s < 60) return `hace ${s}s`;
    if (s < 3600) return `hace ${Math.floor(s / 60)}min`;
    return `hace ${Math.floor(s / 3600)}h`;
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteStatus('⏳ Invitando...');
    try {
      await onInvite(activeTeam.id, inviteEmail);
      setInviteStatus('✓ Invitación enviada');
      setInviteEmail('');
      setTimeout(() => setInviteStatus(null), 3000);
    } catch (err) {
      setInviteStatus(`Error: ${err.message}`);
      setTimeout(() => setInviteStatus(null), 4000);
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: t.muted, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        👥 Equipo y sincronización
      </p>

      {/* Error */}
      {(sync.error || sync.lastError) && (
        <div style={{ padding: '8px 12px', borderRadius: 10, background: t.red + '20', border: `1px solid ${t.red}30`, marginBottom: 8 }}>
          <p style={{ fontSize: 12, color: t.red, margin: 0 }}>{sync.error || sync.lastError}</p>
          <button onClick={sync.clearError} style={{ fontSize: 11, color: t.red, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textDecoration: 'underline' }}>Cerrar</button>
        </div>
      )}

      {/* Team selector (if multiple teams) */}
      {teams.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: t.muted, margin: '0 0 6px' }}>Tus equipos:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {teams.map(team => (
              <button
                key={team.id}
                onClick={() => onSwitchTeam(team.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                  background: team.id === activeTeam?.id ? t.accentSoft : t.card,
                  border: `1.5px solid ${team.id === activeTeam?.id ? t.accent : t.border}`,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: team.id === activeTeam?.id ? t.accent : t.text, flex: 1 }}>
                  {team.name}
                </span>
                {team.id === activeTeam?.id && <span style={{ color: t.accent, fontSize: 12 }}>✓ Activo</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active team info */}
      {activeTeam && (
        <div style={{ background: t.card, borderRadius: 14, border: `1px solid ${t.border}`, padding: '14px 16px' }}>
          {/* Team name */}
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: t.muted, margin: '0 0 2px' }}>Equipo</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: t.accent, margin: 0 }}>
              {activeTeam.name}
            </p>
          </div>

          {/* Sync status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
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

          {/* Last pull counts */}
          {sync.lastPullCounts && !sync.isSyncing && (
            <p style={{ fontSize: 11, color: t.dim, margin: '0 0 12px' }}>
              Último pull: {sync.lastPullCounts.districts}F, {sync.lastPullCounts.suppliers}P, {sync.lastPullCounts.products} prod.
            </p>
          )}

          {/* Members */}
          {teamMembers.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: t.muted, margin: '0 0 6px' }}>Miembros:</p>
              {teamMembers.map(m => (
                <div key={m.userId} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 0',
                }}>
                  <span style={{ fontSize: 12, color: t.text, flex: 1 }}>
                    {m.displayName || m.email}
                  </span>
                  <span style={{
                    fontSize: 10, color: m.role === 'admin' ? t.accent : t.muted,
                    padding: '2px 8px', borderRadius: 6,
                    background: m.role === 'admin' ? t.accentSoft : 'transparent',
                    fontWeight: 600,
                  }}>
                    {m.role === 'admin' ? 'Admin' : 'Miembro'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Force re-sync */}
          <button onClick={sync.forceSync} disabled={sync.isLoading || sync.isSyncing} style={{
            width: '100%', padding: '10px', borderRadius: 10, marginBottom: 8,
            border: `1px solid ${t.accent}40`, background: t.accent + '10',
            color: t.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            opacity: (sync.isLoading || sync.isSyncing) ? 0.5 : 1,
          }}>
            {sync.isSyncing ? '⏳ Sincronizando...' : '🔄 Forzar re-sincronización'}
          </button>

          {/* Invite member (admin only) */}
          {isAdmin && (
            <>
              {showInvite ? (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 11, color: t.muted, margin: '0 0 6px' }}>Invitar por email:</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value.toLowerCase())}
                      placeholder="email@ejemplo.com"
                      type="email"
                      autoFocus
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: 10,
                        border: `1.5px solid ${t.accent}`, background: t.surface,
                        color: t.text, fontSize: 13, outline: 'none',
                      }}
                      onKeyDown={e => e.key === 'Enter' && handleInvite()}
                    />
                    <button onClick={handleInvite} disabled={!inviteEmail.includes('@')} style={{
                      padding: '10px 16px', borderRadius: 10, border: 'none',
                      background: inviteEmail.includes('@') ? t.accent : t.surface,
                      color: inviteEmail.includes('@') ? '#fff' : t.dim,
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>
                      Invitar
                    </button>
                  </div>
                  {inviteStatus && <p style={{ fontSize: 11, color: inviteStatus.startsWith('✓') ? t.green : inviteStatus.startsWith('Error') ? t.red : t.muted, margin: '6px 0 0' }}>{inviteStatus}</p>}
                  <button onClick={() => { setShowInvite(false); setInviteEmail(''); setInviteStatus(null); }} style={{
                    width: '100%', padding: '8px', borderRadius: 8, marginTop: 6,
                    border: `1px solid ${t.border}`, background: 'transparent',
                    color: t.muted, fontSize: 11, cursor: 'pointer',
                  }}>Cancelar</button>
                </div>
              ) : (
                <button onClick={() => setShowInvite(true)} style={{
                  width: '100%', padding: '10px', borderRadius: 10,
                  border: `1px solid ${t.border}`, background: 'transparent',
                  color: t.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  ➕ Invitar miembro
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* No team connected */}
      {!activeTeam && (
        <div style={{ background: t.card, borderRadius: 14, border: `1px solid ${t.border}`, padding: '14px 16px' }}>
          <p style={{ fontSize: 12, color: t.muted, margin: 0 }}>
            No estás conectado a un equipo. Seleccioná uno de tus equipos para sincronizar datos.
          </p>
        </div>
      )}
    </div>
  );
}
