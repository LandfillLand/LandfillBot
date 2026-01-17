import { fileURLToPath, URL } from 'url';
import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

// https://vitejs.dev/config/
export default defineConfig(() => {
  const mdiWoff2OnlyPlugin: Plugin = {
    name: 'astrbot:mdi-woff2-only',
    enforce: 'pre',
    transform(code: string, id: string) {
      const normalizedId = id.replace(/\\/g, '/');
      const cleanId = normalizedId.split('?')[0];
      if (!cleanId.endsWith('/@mdi/font/css/materialdesignicons.css')) return;

      const woff2Match = code.match(/url\(("[^"]+\.woff2[^"]*")\)\s*format\("woff2"\)/);
      if (!woff2Match) return;

      const woff2Url = woff2Match[1];

      let out = code;
      out = out.replace(/^\s*src:\s*url\([^)]*\.eot[^)]*\);\s*\r?\n/m, '');
      let replaced = false;
      out = out.replace(/^\s*src:.*$/m, (line) => {
        if (replaced) return line;
        replaced = true;
        return `  src: url(${woff2Url}) format("woff2");`;
      });

      return {
        code: out,
        map: null,
      };
    },
  };

  const katexWoff2OnlyPlugin: Plugin = {
    name: 'astrbot:katex-woff2-only',
    enforce: 'pre',
    transform(code: string, id: string) {
      const normalizedId = id.replace(/\\/g, '/');
      const cleanId = normalizedId.split('?')[0];
      if (!cleanId.endsWith('/katex/dist/katex.min.css')) return;

      if (!code.includes('@font-face')) return;

      const fontFaceRegex = /@font-face\s*{[\s\S]*?}/g;

      let changed = false;
      const out = code.replace(fontFaceRegex, (block) => {
        const woff2Match = block.match(
          /url\(([^)]+\.woff2[^)]*)\)\s*format\((['"])woff2\2\)/i,
        );
        if (!woff2Match) return block;

        changed = true;
        const woff2Url = woff2Match[1].trim();

        return block.replace(
          /src:[^}]*?(?=})/i,
          `src:url(${woff2Url}) format("woff2")`,
        );
      });

      if (!changed) return;
      return {
        code: out,
        map: null,
      };
    },
  };

  return {
    plugins: [
      mdiWoff2OnlyPlugin,
      katexWoff2OnlyPlugin,
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => ['v-list-recognize-title'].includes(tag)
          }
        }
      }),
      vuetify({
        autoImport: true
      })
    ],
    resolve: {
      alias: {
        // 添加了 mermaid 支持
        'mermaid': 'mermaid/dist/mermaid.js',
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json']
    },
    css: {
      preprocessorOptions: {
        scss: {}
      }
    },
    // Vue 3 生产环境标志
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
    },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1024 * 1024, // Set the limit to 1 MB
      rollupOptions: {
        external: ['stream-monaco']
      }
    },
    optimizeDeps: {
      exclude: [
        'vuetify',
        'stream-monaco',
        '@guolao/vue-monaco-editor',
        'monaco-editor',
        'monaco-editor/esm/vs/editor/editor.worker',
        'monaco-editor/esm/vs/language/json/json.worker',
        'monaco-editor/esm/vs/language/css/css.worker',
        'monaco-editor/esm/vs/language/html/html.worker',
        'monaco-editor/esm/vs/language/typescript/ts.worker'
      ],
      entries: ['./src/**/*.vue']
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:6185/',
          changeOrigin: true
        }
      }
    }
  };
});