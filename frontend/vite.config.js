import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Support BASE_PATH environment variable for flexible deployment
  const basePath = process.env.BASE_PATH || (mode === "workers" ? "/" : "/samuhlagna/");

  return {
    plugins: [react()],
    base: basePath,
  }

})
