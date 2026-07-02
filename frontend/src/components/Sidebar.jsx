import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  Trash2, 
  Radio, 
  Database,
  Smartphone,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, isConnected, onRefresh, isRefreshing }) {
  const menuItems = [
    { id: 'dashboard', label: 'Centro de Mando', icon: LayoutDashboard },
    { id: 'personas', label: 'Gestión Personas', icon: Users },
    { id: 'sync', label: 'Monitor Sync Live', icon: Activity, badge: 'PRO' },
    { id: 'trash', label: 'Papelera Offline', icon: Trash2 },
  ];

  return (
    <aside style={{
      width: '260px',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      background: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      zIndex: 50
    }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px 24px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--primary), #06b6d4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)'
        }}>
          <Radio size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SyncPulse
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 500 }}>Offline-First Hub</p>
        </div>
      </div>

      {/* Connection Status Widget */}
      <div style={{
        margin: '20px 0 12px',
        padding: '12px 14px',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: isConnected ? 'var(--success)' : 'var(--danger)',
            boxShadow: isConnected ? '0 0 12px var(--success)' : 'none',
            animation: isConnected ? 'pulse-glow 2s infinite' : 'none'
          }} />
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {isConnected ? 'Backend Online' : 'Servidor Offline'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              localhost:3000
            </div>
          </div>
        </div>
        <button 
          onClick={onRefresh}
          className="btn-ghost" 
          style={{ padding: '6px', borderRadius: '8px', border: 'none' }}
          title="Actualizar conexión y datos"
        >
          <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, marginTop: '12px' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px 8px' }}>
          Módulos
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '12px',
                background: isActive ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.05))' : 'transparent',
                border: isActive ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent',
                color: isActive ? '#fff' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                fontFamily: 'var(--font-main)',
                fontSize: '0.95rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon size={18} color={isActive ? 'var(--primary)' : 'var(--text-dim)'} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div style={{
        padding: '16px',
        borderRadius: '14px',
        background: 'rgba(139, 92, 246, 0.05)',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--secondary)', fontSize: '0.8rem', fontWeight: 600 }}>
          <Smartphone size={16} />
          <span>Sync Protocol v1.0</span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Móviles Android synchronizando en background vía WorkManager.
        </p>
      </div>
    </aside>
  );
}
