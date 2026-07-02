import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import PersonasView from './components/PersonasView';
import SyncMonitorView from './components/SyncMonitorView';
import TrashView from './components/TrashView';
import { api } from './services/api';
import { Radio, AlertCircle, CheckCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [personas, setPersonas] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAllData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const health = await api.checkHealth();
      setIsConnected(health);

      if (health) {
        const [personasData, syncData] = await Promise.all([
          api.getPersonas(),
          api.getSyncLog(0, 100)
        ]);
        setPersonas(personasData);
        setSyncLogs(syncData.changes || []);
      }
    } catch (err) {
      console.error('Error cargando datos de sincronización:', err);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
    // Auto polling para ver si los móviles subieron datos en background
    const interval = setInterval(() => {
      loadAllData(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  // CRUD Handlers con actualización automática
  const handleCreate = async (data) => {
    try {
      const created = await api.createPersona(data);
      showToast(`¡Persona ${created.nombre} creada y guardada en PostgreSQL!`);
      await loadAllData(true);
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      const updated = await api.updatePersona(id, data);
      showToast(`¡Registro actualizado a v${updated.version}!`, 'success');
      await loadAllData(true);
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    try {
      const deleted = await api.deletePersona(id);
      showToast(`Persona eliminada. Evento SOFT DELETE registrado en sync_log.`, 'success');
      await loadAllData(true);
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <div className="animate-slide-up" style={{
          position: 'fixed',
          top: '24px',
          right: '32px',
          zIndex: 9999,
          padding: '14px 20px',
          borderRadius: '12px',
          background: toast.type === 'error' ? 'var(--danger)' : '#10b981',
          color: 'white',
          fontWeight: 600,
          fontSize: '0.9rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isConnected={isConnected} 
        onRefresh={() => loadAllData(false)}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {!isConnected && (
          <div className="animate-slide-up" style={{
            padding: '16px 24px',
            borderRadius: '14px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 500
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={20} />
              <span>
                <strong>Servidor Desconectado:</strong> No se pudo conectar a <code>http://localhost:3000/api</code>. Verifica que tu backend Node.js esté corriendo con <code>npm run dev</code>.
              </span>
            </div>
            <button onClick={() => loadAllData(false)} className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '0.8rem', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
              Reintentar Conexión
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView 
            personas={personas} 
            syncLogs={syncLogs} 
            onNavigate={setActiveTab} 
          />
        )}

        {activeTab === 'personas' && (
          <PersonasView 
            personas={personas} 
            onCreate={handleCreate} 
            onUpdate={handleUpdate} 
            onDelete={handleDelete}
            isLoading={isLoading} 
          />
        )}

        {activeTab === 'sync' && (
          <SyncMonitorView 
            syncLogs={syncLogs} 
            onRefresh={() => loadAllData(false)}
            isLoading={isLoading} 
          />
        )}

        {activeTab === 'trash' && (
          <TrashView 
            syncLogs={syncLogs} 
          />
        )}
      </main>
    </div>
  );
}
