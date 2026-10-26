import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';


export default defineConfig({
  plugins: [
    react()
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@syncfusion/ej2-react-charts')) return 'charts';
          if (id.includes('@syncfusion/ej2-react-interactive-chat')) return 'assist';
          if (id.includes('@syncfusion')) return 'syncfusion';
        }
      }
    }
  },
  server: { host: '0.0.0.0' }
});
