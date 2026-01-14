import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Coin-Collectors-P2E/',  // ← Ändra till ditt EXAKTA repo-namn! (stort/litet känsligt, med slashar)
})
