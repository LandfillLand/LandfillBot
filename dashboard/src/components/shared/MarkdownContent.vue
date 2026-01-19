<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { MarkdownRender, enableKatex, enableMermaid } from 'markstream-vue';
import 'katex/dist/katex.min.css';

import { proxyBadgeUrls } from '@/utils/markdown';
import { shikiWasmReady } from '@/composables/shikiWasm';
import { useCustomizerStore } from '@/stores/customizer';

enableKatex();
enableMermaid();

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    content: string;
    typewriter?: boolean;
    preprocessBadges?: boolean;
  }>(),
  {
    typewriter: false,
    preprocessBadges: true,
  },
);

const attrs = useAttrs();

const forwardedAttrs = computed(() => {
  const { class: _klass, ...rest } = attrs as Record<string, unknown>;
  return rest;
});

const normalizedContent = computed(() => {
  if (!props.preprocessBadges) return props.content;
  return proxyBadgeUrls(props.content);
});

const mergedClass = computed(() => {
  const klass = attrs.class;
  return ['markdown-content', klass].filter(Boolean);
});

const customizer = useCustomizerStore();
const isDark = computed(() => customizer.uiTheme === 'PurpleThemeDark');
</script>

<template>
  <div class="markdown-body">
    <MarkdownRender
      v-bind="forwardedAttrs"
      :key="shikiWasmReady ? 'shiki' : 'pre'"
      :content="normalizedContent"
      :typewriter="typewriter"
      :is-dark="isDark"
      :render-code-blocks-as-pre="false"
      :class="mergedClass"
    />
  </div>
</template>
