import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh
      fastRefresh: true,
      // Optimize deps
      babel: {
        plugins: [
          // Add any babel plugins if needed
        ]
      }
    })
  ],
  server: {
    port: 3000,
    open: true,
    host: '0.0.0.0', // Allow network access
    https: true, // Set to true if you have SSL certificates
   // Uncomment below to enable HTTPS with self-signed certificate:
    https: {
      key: './cert/key.pem',
      cert: './cert/cert.pem'
    }
  },
  build: {
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-icons': ['phosphor-react'],
        }
      }
    },
    // Optimize build
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'phosphor-react']
  }
})
