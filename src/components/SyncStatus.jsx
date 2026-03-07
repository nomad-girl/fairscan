/**
 * SyncStatus Component
 * Compact floating indicator showing AI processing queue status
 * - Green dot: all processed
 * - Orange dot (pulsing): syncing in progress
 * - Red dot: offline with pending items
 */

import { useSyncWithAI } from '../hooks/useSyncWithAI.js';

export function SyncStatus({ theme = 'dark', settings }) {
  try {
    const { isOnline, isSyncing, error, syncNow, pendingCount, processedCount, totalCount } = useSyncWithAI(settings);

    // Don't show if nothing pending and not syncing
    if (pendingCount === 0 && !isSyncing && !error) {
      return null;
    }

    const isDark = theme === 'dark';

    const dotColor = isSyncing
      ? '#ff9800'  // orange: syncing
      : !isOnline
        ? '#f44336'  // red: offline
        : pendingCount > 0
          ? '#ff9800'  // orange: pending
          : '#4caf50'; // green: done

    const label = isSyncing
      ? `Procesando ${processedCount}/${totalCount}...`
      : !isOnline
        ? `${pendingCount} en cola`
        : pendingCount > 0
          ? `${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''}`
          : 'Todo procesado';

    return (
      <div
        onClick={() => { if (isOnline && !isSyncing && pendingCount > 0) syncNow(); }}
        style={{
          position: 'fixed',
          bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
          left: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px 6px 8px',
          borderRadius: 20,
          background: isDark ? 'rgba(30,30,30,0.9)' : 'rgba(250,250,250,0.9)',
          border: `1px solid ${isDark ? '#333' : '#ddd'}`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          cursor: isOnline && !isSyncing && pendingCount > 0 ? 'pointer' : 'default',
          zIndex: 50,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Status dot */}
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: dotColor,
          boxShadow: `0 0 6px ${dotColor}80`,
          animation: isSyncing ? 'aiSyncPulse 1.2s ease-in-out infinite' : 'none',
          flexShrink: 0,
        }} />

        {/* Label */}
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: isDark ? '#ccc' : '#555',
          whiteSpace: 'nowrap',
        }}>
          {label}
        </span>

        {/* Error indicator */}
        {error && (
          <span style={{ fontSize: 10, color: '#f44336', marginLeft: 2 }} title={error}>!</span>
        )}

        <style>{`
          @keyframes aiSyncPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.8); }
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
