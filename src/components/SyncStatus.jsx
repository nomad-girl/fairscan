/**
 * SyncStatus Component
 * Shows AI processing status and sync information
 */

import { useSyncWithAI } from '../hooks/useSyncWithAI.js';

const T = {
  // Light theme
  light: {
    bg: '#fafafa',
    border: '#e0e0e0',
    text: '#333',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
  },
  // Dark theme
  dark: {
    bg: '#1a1a1a',
    border: '#333',
    text: '#fff',
    success: '#81c784',
    warning: '#ffb74d',
    error: '#ef5350',
  },
};

export function SyncStatus({ theme = 'dark' }) {
  try {
    const { isOnline, isSyncing, error, syncNow, pendingCount } = useSyncWithAI();
    const colors = T[theme];

    // Don't show if nothing pending
    if (!pendingCount || (pendingCount === 0 && !isSyncing && !error)) {
      return null;
    }

  const syncStatusText = isSyncing
    ? 'Sincronizando...'
    : isOnline
      ? 'En línea'
      : 'Sin conexión';

  const statusColor = isSyncing
    ? colors.warning
    : isOnline
      ? colors.success
      : colors.error;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI"',
        fontSize: '12px',
        color: colors.text,
        zIndex: 1000,
        maxWidth: '300px',
      }}
    >
      {/* Status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: statusColor,
            animation: isSyncing ? 'pulse 1.5s infinite' : 'none',
          }}
        />
        <span style={{ fontWeight: '600' }}>{syncStatusText}</span>
      </div>

      {/* Pending count */}
      {pendingCount > 0 && (
        <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '8px' }}>
          {pendingCount} {pendingCount === 1 ? 'elemento' : 'elementos'} pendiente de procesar
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{ fontSize: '11px', color: colors.error, marginBottom: '8px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Sync button */}
      {isOnline && !isSyncing && pendingCount > 0 && (
        <button
          onClick={syncNow}
          style={{
            width: '100%',
            padding: '6px 12px',
            backgroundColor: colors.success,
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.target.style.opacity = '0.8')}
          onMouseLeave={(e) => (e.target.style.opacity = '1')}
        >
          Sincronizar ahora
        </button>
      )}

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
    );
  } catch (err) {
    console.error('SyncStatus error:', err);
    return null;
  }
}

export default SyncStatus;
