import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  GitBranch, 
  Mail, 
  Phone, 
  X,
  Check,
  AlertCircle,
  Database
} from 'lucide-react';

export default function PersonasView({ personas = [], onCreate, onUpdate, onDelete, isLoading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    correo: ''
  });
  
  const [errorMsg, setErrorMsg] = useState('');

  // Filtrar personas activas y por búsqueda
  const activePersonas = personas.filter(p => !p.deleted_at);
  const filteredPersonas = activePersonas.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      p.nombre?.toLowerCase().includes(term) ||
      p.apellido?.toLowerCase().includes(term) ||
      p.correo?.toLowerCase().includes(term) ||
      p.telefono?.includes(term)
    );
  });

  const handleOpenCreate = () => {
    setEditingPersona(null);
    setFormData({ nombre: '', apellido: '', telefono: '', correo: '' });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (persona) => {
    setEditingPersona(persona);
    setFormData({
      nombre: persona.nombre || '',
      apellido: persona.apellido || '',
      telefono: persona.telefono || '',
      correo: persona.correo || ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (editingPersona) {
        await onUpdate(editingPersona.id, formData);
      } else {
        await onCreate(formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error al guardar');
    }
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Controls Header */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--primary)' }}>
              <Users size={22} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Gestión de Personas (CRUD Online)</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            {activePersonas.length} registros activos sincronizados con la base de datos PostgreSQL.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, correo o tel..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '40px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Create Button */}
          <button onClick={handleOpenCreate} className="btn btn-primary">
            <Plus size={18} /> Nueva Persona
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '16px 20px' }}># / UUID</th>
                <th style={{ padding: '16px 20px' }}>Persona</th>
                <th style={{ padding: '16px 20px' }}>Contacto</th>
                <th style={{ padding: '16px 20px' }}>Sync Versión</th>
                <th style={{ padding: '16px 20px' }}>Estado</th>
                <th style={{ padding: '16px 20px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Cargando datos desde PostgreSQL...
                  </td>
                </tr>
              ) : filteredPersonas.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No se encontraron personas {searchTerm ? 'con esa búsqueda' : 'registradas aún'}.
                  </td>
                </tr>
              ) : (
                filteredPersonas.map((persona) => (
                  <tr 
                    key={persona.id || persona.uuid}
                    style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* ID & UUID */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>#{persona.id}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        {persona.uuid?.slice(0, 8)}...
                      </div>
                    </td>

                    {/* Nombre y Apellido */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, fontSize: '1rem', color: '#fff' }}>
                        {persona.nombre} {persona.apellido}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Database size={12} /> Creado: {persona.created_at ? new Date(persona.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>

                    {/* Contacto */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                        <Mail size={14} color="var(--secondary)" />
                        <span>{persona.correo}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <Phone size={14} color="var(--text-dim)" />
                        <span>{persona.telefono}</span>
                      </div>
                    </td>

                    {/* Sync Versión */}
                    <td style={{ padding: '16px 20px' }}>
                      <span className="badge badge-version" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                        <GitBranch size={12} /> v{persona.version || 1}
                      </span>
                    </td>

                    {/* Estado */}
                    <td style={{ padding: '16px 20px' }}>
                      <span className="badge badge-success">
                        Activo
                      </span>
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleOpenEdit(persona)}
                          className="btn-ghost" 
                          style={{ padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}
                          title="Editar Persona"
                        >
                          <Edit3 size={16} color="var(--secondary)" />
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm(`¿Seguro que deseas eliminar a ${persona.nombre} ${persona.apellido}? (Se enviará a Papelera por Borrado Lógico)`)) {
                              onDelete(persona.id);
                            }
                          }}
                          className="btn-danger" 
                          style={{ padding: '8px', borderRadius: '10px' }}
                          title="Eliminar (Borrado Lógico)"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div className="glass-panel animate-slide-up" style={{
            width: '100%',
            maxWidth: '480px',
            padding: '28px',
            background: 'var(--bg-card)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            border: '1px solid rgba(139, 92, 246, 0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                {editingPersona ? <Edit3 size={20} color="var(--primary)" /> : <Plus size={20} color="var(--primary)" />}
                {editingPersona ? 'Editar Persona' : 'Registrar Nueva Persona'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="btn-ghost" style={{ padding: '6px', borderRadius: '8px', border: 'none' }}>
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'var(--danger-bg)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Nombre *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej: Cristian"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="input-field" 
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Apellido *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej: Cantillo"
                    value={formData.apellido}
                    onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                    className="input-field" 
                  />
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Correo Electrónico *</label>
                <input 
                  type="email" 
                  required 
                  placeholder="ejemplo@gmail.com"
                  value={formData.correo}
                  onChange={(e) => setFormData({...formData, correo: e.target.value})}
                  className="input-field" 
                />
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">Teléfono *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ej: 3001234567"
                  value={formData.telefono}
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  className="input-field" 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} /> {editingPersona ? 'Actualizar Cambios' : 'Guardar en BD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
