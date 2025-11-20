import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Vite typically uses import.meta.env, but the Google GenAI SDK examples
      // and our code use process.env.API_KEY. We polyfill it here.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    // Important for GitHub Pages if you are deploying to https://<user>.github.io/<repo>/
    // Change this to './' for relative paths to make it work on any subpath
    base: './', 
  };
});