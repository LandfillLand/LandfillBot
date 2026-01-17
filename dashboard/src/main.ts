import { createApp, type Plugin } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import vuetify from './plugins/vuetify';
import confirmPlugin from './plugins/confirmPlugin';
import { setupI18n } from './i18n/composables';
import '@/scss/style.scss';
import VueApexCharts from 'vue3-apexcharts';

import print from 'vue3-print-nb';
import { loader } from '@guolao/vue-monaco-editor'
import axios from 'axios';
import { initShikiWasm } from '@/composables/shikiWasm';
import { MarkdownCodeBlockNode, setCustomComponents } from 'markstream-vue';

// 初始化i18n系统，等待完成后再挂载应用
setupI18n().then(async () => {
  console.log('🌍 i18n系统初始化完成');

  await initShikiWasm();

  // Prefer Shiki-based code blocks over plain <pre> / Monaco.
  setCustomComponents({ code_block: MarkdownCodeBlockNode });
  
  const app = createApp(App);
  app.use(router);
  const pinia = createPinia();
  app.use(pinia);
  app.use(print);
  app.use(VueApexCharts as Plugin);
  app.use(vuetify);
  app.use(confirmPlugin);
  app.mount('#app');
  
  // 挂载后同步 Vuetify 主题
  import('./stores/customizer').then(({ useCustomizerStore }) => {
    const customizer = useCustomizerStore(pinia);
    vuetify.theme.global.name.value = customizer.uiTheme;
  });
}).catch(async error => {
  console.error('❌ i18n系统初始化失败:', error);

  await initShikiWasm();
  
  // 即使i18n初始化失败，也要挂载应用（使用回退机制）
  const app = createApp(App);
  app.use(router);
  const pinia = createPinia();
  app.use(pinia);
  app.use(print);
  app.use(VueApexCharts as Plugin);
  app.use(vuetify);
  app.use(confirmPlugin);
  app.mount('#app');
  
  // 挂载后同步 Vuetify 主题
  import('./stores/customizer').then(({ useCustomizerStore }) => {
    const customizer = useCustomizerStore(pinia);
    vuetify.theme.global.name.value = customizer.uiTheme;
  });
});


axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.54.0/min/vs',
  },
  'vs/nls': { availableLanguages: { '*': 'zh-cn' } },
})