<template>
    <div
        class="mb-3 mt-1.5 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden w-fit"
        :style="containerStyle"
    >
        <div class="reasoning-header inline-flex items-center px-2 py-2 cursor-pointer select-none rounded-2xl transition-colors"
            @click="toggleExpanded">
            <v-icon size="small" class="mr-1.5 reasoning-accent transition-transform"
                :class="{ 'rotate-90': isExpanded }">
                mdi-chevron-right
            </v-icon>
            <span class="text-sm font-medium reasoning-accent tracking-wide">
                {{ tm('reasoning.thinking') }}
            </span>
        </div>
        <div v-if="isExpanded" class="px-3 border-t border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 animate-fade-in italic">
            <MarkdownRender
                :key="shikiWasmReady ? 'shiki' : 'pre'"
                :content="reasoning"
                class="reasoning-text markdown-content text-sm leading-relaxed"
                :typewriter="false"
                :is-dark="isDark"
                :render-code-blocks-as-pre="false"
                :class="{ dark: isDark }"
                :style="isDark ? { opacity: '0.85' } : {}"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useModuleI18n } from '@/i18n/composables';
import { MarkdownRender } from 'markstream-vue';
import 'markstream-vue/index.css';
import 'katex/dist/katex.min.css';
import { shikiWasmReady } from '@/composables/shikiWasm';

const props = withDefaults(
    defineProps<{
        reasoning: string;
        isDark?: boolean;
        initialExpanded?: boolean;
    }>(),
    {
        isDark: false,
        initialExpanded: false
    }
);

const { tm } = useModuleI18n('features/chat');
const isExpanded = ref<boolean>(props.initialExpanded);

const containerStyle = computed<Record<string, string>>(() => {
    const bgAlpha = props.isDark ? '0.08' : '0.06';
    return {
        backgroundColor: `rgba(var(--v-theme-secondary), ${bgAlpha})`
    };
});

const toggleExpanded = () => {
    isExpanded.value = !isExpanded.value;
};
</script>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

.rotate-90 {
    transform: rotate(90deg);
}

.reasoning-text {
    font-size: 14px;
    line-height: 1.6;
    color: var(--v-theme-secondaryText);
}

.reasoning-accent {
    color: rgb(var(--v-theme-secondary));
}

.reasoning-header:hover {
    background-color: rgba(var(--v-theme-secondary), 0.08);
}
</style>
