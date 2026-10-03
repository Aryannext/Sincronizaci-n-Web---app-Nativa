import React, { useState } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  Clock, 
  RotateCcw, 
  ShieldAlert,
  GitBranch
} from 'lucide-react';

export default function TrashView({ eliminadas = [], onRestore }) {
  const [restaurandoId, setRestaurandoId] = useState(null);

  const handleRestore = async (persona) => {
    if (!window.confirm(`¿Restaurar a ${persona.nombre} ${persona.apellido}? Volverá a la lista de personas y a los dispositivos móviles.`)) return;
    setRestaurandoId(persona.id);
    try {
      await onRestore(persona);
    } catch {
      // El error ya se muestra en un aviso desde App
    } finally {
      setRestaurandoId(null);
    }
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(15, 23, 42, 0.8))' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' }}>
              <Trash2 size={22} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Papelera de Borrado Lógico (Soft Delete)</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Los registros eliminados no se borran físicamente de PostgreSQL; se actualiza su campo <code>deleted_at</code> y se notifica a los móviles en el próximo ciclo Sync.
          </p>
        </div>

        <div className="badge badge-danger" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
          <AlertTriangle size={16} /> {eliminadas.length} Registros en Papelera
        </div>
      </div>

      {/* Info Notice */}
      <div style={{
        padding: '16px 20px',
        borderRadius: '14px',
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        color: '#fbbf24'
      }}>
        <ShieldAlert size={24} />
        <div style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-main)' }}>
          <strong style={{ color: '#fbbf24' }}>Garantía de Integridad Offline:</strong> Al realizar un borrado lógico, la base de datos incrementa el número de <code>version</code> y escribe el evento en el log de sincronización. Cuando un dispositivo móvil sin conexión se reconecte, descargará este evento y limpiará su base de datos local SQLite/Room sin colisiones.
        </div>
      </div>

      {/* Deleted Items Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '16px 20px' }}>ID</th>
                <th style={{ padding: '16px 20px' }}>Registro Eliminado</th>
                <th style={{ padding: '16px 20px' }}>UUID Original</th>
                <th style={{ padding: '16px 20px' }}>Fecha de Borrado</th>
                <th style={{ padding: '16px 20px' }}>Versión Final</th>
                <th style={{ padding: '16px 20px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {eliminadas.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    La papelera está vacía. No se ha eliminado ninguna persona recientemente.
                  </td>
                </tr>
              ) : (
                eliminadas.map((persona) => (
                  <tr key={persona.uuid} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--danger)' }}>
                      #{persona.id}
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 600, fontSize: '0.95rem', color: '#fff' }}>
                      {persona.nombre} {persona.apellido}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400 }}>{persona.correo}</div>
                    </td>
                    <td style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      {persona.uuid}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} color="var(--danger)" />
                        <span>{new Date(persona.deleted_at).toLocaleString()}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className="badge badge-version" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                        <GitBranch size={12} /> v{persona.version} (Eliminado)
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <button
                        onClick={() => handleRestore(persona)}
                        disabled={restaurandoId === persona.id}
                        className="btn btn-ghost"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        title="Restaurar persona"
                      >
                        <RotateCcw size={14} /> {restaurandoId === persona.id ? 'Restaurando…' : 'Restaurar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
