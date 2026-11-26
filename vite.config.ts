import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react-router-dom', '@use-gesture/react', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', 'canvas-confetti', 'lucide-react', '@supabase/supabase-js'],
  },
})
