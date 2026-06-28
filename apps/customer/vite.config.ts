import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({base:process.env.VITE_BASE_PATH??'/',plugins:[react(),VitePWA({registerType:'autoUpdate',manifest:{name:'MiClub Chile',short_name:'MiClub',description:'Todos tus beneficios en un solo lugar',theme_color:'#7c3aed',background_color:'#ffffff',display:'standalone',orientation:'portrait',start_url:'.'}})]});
