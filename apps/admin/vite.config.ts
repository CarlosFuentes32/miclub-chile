import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({base:process.env.VITE_BASE_PATH??'/',plugins:[react(),VitePWA({registerType:'autoUpdate',manifest:{name:'MiClub Administración',short_name:'MiClub Admin',description:'Control operativo global de MiClub Chile',theme_color:'#6d28d9',background_color:'#f8fafc',display:'standalone',start_url:'.'}})]});
