import React from 'react';
import { 
  Users, 
  RefreshCw, 
  Trash2, 
  GitBranch, 
  ArrowUpRight, 
  Smartphone, 
  CheckCircle2, 
  Clock,
  Zap,
  Activity
} from 'lucide-react';

export default function DashboardView({ personas = [], syncLogs = [], onNavigate }) {
  const activePersonas = personas.filter(p => !p.deleted_at);
  const deletedPersonas = syncLogs.filter(log => log.operation === 'DELETE');
  const totalSyncs = syncLogs.length;
  
  // Calcular promedios y actividad
  const avgVersion = activePersonas.length > 0 
    ? (activePersonas.reduce((acc, p) => acc + (p.version || 1), 0) / activePersonas.length).toFixed(1)
    : '1.0';

  const recentLogs = [...syncLogs].reverse().slice(0, 5);

  const stats = [
    {
      title: 'Personas Activas',
      value: activePersonas.length,
      change: '+100% sincronizado',
      icon: Users,
      color: '#8b5cf6',
      bgGlow: 'rgba(139, 92, 246, 0.15)',
      action: () => onNavigate('personas')
    },
    {
      title: 'Operaciones en Sync',
      value: totalSyncs,
      change: 'Historial auditado',
      icon: Activity,
      color: '#06b6d4',
      bgGlow: 'rgba(6, 182, 212, 0.15)',
      action: () => onNavigate('sync')
    },
    {
      title: 'Versión Promedio',
      value: `v${avgVersion}`,
      change: 'Ediciones remotas',
      icon: GitBranch,
      color: '#10b981',
      bgGlow: 'rgba(16, 185, 129, 0.15)',
      action: () => onNavigate('personas')
    },
    {
      title: 'Papelera Offline',
      value: deletedPersonas.length,
      change: 'Borrado lógico',
      icon: Trash2,
      color: '#ef4444',
      bgGlow: 'rgba(239, 68, 68, 0.15)',
      action: () => onNavigate('trash')
    }
  ];

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Banner / Header */}
      <div className="glass-panel" style={{
        padding: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.08))',
        border: '1px solid rgba(139, 92, 246, 0.25)'
      }}>
        <div style={{ maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-success">
              <Zap size={12} /> Arquitectura Offline-First
            </span>
            <span className="badge badge-version">Android Room + Node.js</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>
            Centro de Mando de Sincronización
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.5 }}>
            Monitorea en tiempo real los datos recopilados por las aplicaciones móviles Android en terreno cuando recuperan su conexión Wi-Fi o Datos Celulares.
          </p>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          padding: '20px',
          borderRadius: '16px',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <Smartphone size={40} color="var(--secondary)" style={{ animation: 'pulse-glow 3s infinite' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>DISPOSITIVOS MÓVILES</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Push & Pull Listo</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index} 
              onClick={stat.action}
              className="glass-card" 
              style={{
                padding: '24px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '100px',
                height: '100px',
                background: stat.bgGlow,
                borderRadius: '50%',
                filter: 'blur(30px)',
                zIndex: 0
              }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>{stat.title}</span>
                <div style={{
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  color: stat.color
                }}>
                  <Icon size={20} />
                </div>
              </div>
              <div style={{ zIndex: 1 }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{stat.value}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: stat.color, marginTop: '4px', fontWeight: 600 }}>
                  <span>{stat.change}</span>
                  <ArrowUpRight size={14} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Sync Feed Preview */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Actividad de Sincronización Reciente</h3>
            </div>
            <button onClick={() => onNavigate('sync')} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              Ver Feed Completo
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentLogs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                No hay operaciones de sincronización registradas aún. ¡Conecta tu teléfono!
              </div>
            ) : (
              recentLogs.map((log, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`badge ${
                      log.operation === 'CREATE' ? 'badge-success' :
                      log.operation === 'UPDATE' ? 'badge-warning' : 'badge-danger'
                    }`} style={{ width: '75px', justifyContent: 'center' }}>
                      {log.operation}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        {log.data ? `${log.data.nombre} ${log.data.apellido}` : `UUID: ${log.record_uuid.slice(0,13)}...`}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        {log.record_uuid}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-version" style={{ marginBottom: '4px' }}>
                      v{log.data?.version || 1}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                      <Clock size={12} />
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Tips & Architecture card */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.8)' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="var(--success)" />
              Flujo de Terreno
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <div style={{ paddingLeft: '12px', borderLeft: '2px solid var(--primary)' }}>
                <strong style={{ color: 'var(--text-main)' }}>1. Modo Avión / Sin Señal</strong>
                <p style={{ marginTop: '4px' }}>El usuario en el móvil Android guarda personas en Room localmente. Estado: <code>PENDING</code>.</p>
              </div>
              <div style={{ paddingLeft: '12px', borderLeft: '2px solid var(--secondary)' }}>
                <strong style={{ color: 'var(--text-main)' }}>2. WorkManager Escucha</strong>
                <p style={{ marginTop: '4px' }}>El sistema operativo detecta que se recuperó el Wi-Fi y ejecuta <code>tryToSyncPush()</code>.</p>
              </div>
              <div style={{ paddingLeft: '12px', borderLeft: '2px solid var(--success)' }}>
                <strong style={{ color: 'var(--text-main)' }}>3. Reflejo en Web</strong>
                <p style={{ marginTop: '4px' }}>La base de datos PostgreSQL recibe los datos y aparecen al instante en este Centro de Mando.</p>
              </div>
            </div>
          </div>

          <button onClick={() => onNavigate('personas')} className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }}>
            <Users size={16} /> Administrar Personas Ahora
          </button>
        </div>
      </div>
    </div>
  );
}
