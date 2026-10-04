import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Ruta donde se publica el panel: "/" en local, "/sincronizacion/" en el VPS (ver despliegue/web.Dockerfile)
  base: loadEnv(mode, process.cwd()).VITE_BASE || '/',
  plugins: [react()],
}))
