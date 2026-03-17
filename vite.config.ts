import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // List of potential keys in order of priority
  const potentialKeys = [
    env.USER_GEMINI_KEY,
    process.env.USER_GEMINI_KEY,
    env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY,
    env.API_KEY,
    process.env.API_KEY
  ];

  // Find the first key that isn't empty or a placeholder
  const GEMINI_API_KEY = potentialKeys.find(k => 
    k && 
    k !== '' && 
    k !== 'undefined' && 
    !k.includes('MY_GEMINI_API_KEY') && 
    !k.includes('YOUR_API_KEY')
  ) || '';
  
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
