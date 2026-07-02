import React, { useState } from 'react';
import { 
  Activity, 
  RefreshCw, 
  Smartphone, 
  Database, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  Terminal,
  Eye,
  CheckCircle2,
  GitBranch
} from 'lucide-react';

export default function SyncMonitorView({ syncLogs = [], onRefresh, isLoading }) {
  const [selectedLog, setSelectedLog] = useState(null);
  const [filterOp, setFilterOp] = useState('ALL'); // ALL, CREATE, UPDATE, DELETE

  const filteredLogs = filterOp === 'ALL' 
    ? syncLogs 
    : syncLogs.filter(log => log.operation === filterOp);

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--secondary)' }}>
              <Activity size={22} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Monitor de Sincronización en Vivo</h2>
            <span className="badge badge-info" style={{ marginLeft: '6px' }}>Sync Log Feed</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Auditoría en tiempo real de todas las transacciones empujadas desde dispositivos Android locales (Room / WorkManager).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            {['ALL', 'CREATE', 'UPDATE', 'DELETE'].map(op => (
              <button
                key={op}
                onClick={() => setFilterOp(op)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: filterOp === op ? 'var(--primary)' : 'transparent',
                  color: filterOp === op ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}
              >
                {op === 'ALL' ? 'Todos' : op}
              </button>
            ))}
          </div>

          <button onClick={onRefresh} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <RefreshCw size={16} /> Actualizar Feed
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        {/* Timeline List */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={18} color="var(--primary)" />
              Flujo de Eventos SQL (`sync_log`)
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Total: {filteredLogs.length} eventos
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' }}>
            {isLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Consultando tabla sync_log...
              </div>
            ) : filteredLogs.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
                No hay operaciones registradas para este filtro.
              </div>
            ) : (
              [...filteredLogs].reverse().map((log, i) => {
                const isSelected = selectedLog?.change_id === log.change_id;
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedLog(log)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      borderRadius: '14px',
                      background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: log.operation === 'CREATE' ? 'var(--success-bg)' :
                                    log.operation === 'UPDATE' ? 'var(--warning-bg)' : 'var(--danger-bg)',
                        color: log.operation === 'CREATE' ? 'var(--success)' :
                               log.operation === 'UPDATE' ? 'var(--warning)' : 'var(--danger)',
                        fontWeight: 700,
                        fontSize: '0.8rem'
                      }}>
                        {log.operation === 'CREATE' ? '+' : log.operation === 'UPDATE' ? '~' : '-'}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                            {log.data ? `${log.data.nombre} ${log.data.apellido}` : `Registro #${log.change_id}`}
                          </span>
                          <span className="badge badge-version" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                            change_id: #{log.change_id}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                          UUID: {log.record_uuid}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <span className={`badge ${
                        log.operation === 'CREATE' ? 'badge-success' :
                        log.operation === 'UPDATE' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {log.operation}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Payload Inspector / Live Architecture Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* JSON Inspector */}
          <div className="glass-card" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--secondary)' }}>
              <Eye size={18} /> Inspector de Payload JSON
            </h3>
            {selectedLog ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Detalles capturados en la tabla <code>sync_log</code> para el change_id #{selectedLog.change_id}:
                </div>
                <pre style={{
                  background: 'rgba(0,0,0,0.6)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  color: '#34d399',
                  overflowX: 'auto',
                  flex: 1
                }}>
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            ) : (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-dim)',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '12px',
                border: '1px dashed var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                justifyContent: 'center',
                flex: 1
              }}>
                <GitBranch size={32} color="var(--text-dim)" />
                <p style={{ fontSize: '0.85rem' }}>Selecciona cualquier evento del timeline para inspeccionar la estructura JSON que recibe o envía el móvil en sus sincronizaciones.</p>
              </div>
            )}
          </div>

          {/* Sync Architecture Guide */}
          <div className="glass-panel" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(0,0,0,0.4))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#c4b5fd', fontWeight: 600, fontSize: '0.9rem' }}>
              <Smartphone size={16} /> ¿Cómo funciona el Pull?
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Cuando la app Android llama a <code>GET /api/sync?last_change_id=X</code>, Node.js filtra esta misma tabla devolviendo solo los registros con ID superior a X.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
