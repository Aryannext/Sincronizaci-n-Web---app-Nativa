import React, { useState } from 'react';
import { Radio, LogIn, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function LoginView({ onLogin, aviso }) {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setEnviando(true);
    try {
      const datos = await api.login(correo, password);
      // El panel web es para administradores; los operadores usan la app móvil
      if (datos.usuario.rol !== 'admin') {
        setErrorMsg('Esta cuenta es de operador móvil y no tiene acceso al panel web.');
        return;
      }
      onLogin(datos);
    } catch (err) {
      setErrorMsg(err.status ? err.message : 'No se pudo conectar con el servidor.');
    } finally {
      setEnviando(false);
    }
  };

  const mensaje = errorMsg || aviso;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary), #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Radio size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>SyncPulse</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Inicia sesión para administrar</p>
          </div>
        </div>

        {mensaje && (
          <div role="alert" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 14px',
            marginBottom: '16px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{mensaje}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" htmlFor="login-correo">Correo</label>
            <input
              id="login-correo"
              type="email"
              required
              autoComplete="username"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label" htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={enviando} style={{ width: '100%' }}>
            <LogIn size={16} /> {enviando ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
