import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      build: {
        outDir: 'dist',
        rollupOptions: {
          input: {
            popup: 'popup.html',
            index: 'index.html',
            offscreen: 'offscreen.html'
          },
          output: {
            entryFileNames: '[name].js',
            chunkFileNames: '[name]-[hash].js',
            assetFileNames: '[name].[ext]'
          }
        },
        emptyOutDir: true
      },
      plugins: [
        viteStaticCopy({
          targets: [
            {
              src: 'manifest.json',
              dest: '.'
            },
            {
              src: 'popup.html',
              dest: '.'
            },
            {
              src: 'index.html',
              dest: '.'
            },
            {
              src: 'offscreen.html',
              dest: '.'
            },
            {
              src: 'popup.css',
              dest: '.'
            },
            {
              src: 'index.css',
              dest: '.'
            },
            {
              src: 'public/**/*',
              dest: '.'
            }
          ]
        })
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
