<template>
  <div class="logo-container">
    <div class="logo-content">
      <div class="logo-image">
        <img width="110" src="@/assets/images/nebula_logo_mini.webp" alt="Nebula Logo">
      </div>
      <div class="logo-text">
        <h2 
          class="logo-title"
          v-html="formatTitle(title || t('core.header.logoTitle'))"
        ></h2>
        <h4 class="hint-text logo-subtitle">{{ subtitle || t('core.header.accountDialog.title') }}</h4>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/i18n/composables';

const { t } = useI18n();

const props = withDefaults(defineProps<{
  title?: string;
  subtitle?: string;
}>(), {
  title: '',  // 默认为空，组件会使用翻译值
  subtitle: ''
})

// 智能格式化标题，在小屏幕上允许在合适位置换行
const formatTitle = (title: string) => {
  // 如果标题包含 "Nebula" 和其他文字，在它们之间添加换行机会
  if (title.includes('Nebula ') || title.includes('Nebula')) {
    // 处理 "Nebula 仪表盘" 或 "Nebula Dashboard" 等格式
    return title.replace(/(Nebula)\s+(.+)/, '$1<wbr> $2');
  }
  return title;
}
</script>

<style scoped>
.logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-bottom: 10px;
}

.logo-content {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px;
  max-width: 100%;
  overflow: visible;
}

.logo-image {
  display: flex;
  justify-content: center;
  align-items: center;
}

.logo-image img {
  transition: transform 0.3s ease;
}

.logo-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  flex: 1;
}

.logo-text h2 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  white-space: nowrap;
  min-width: fit-content;
}

.logo-title {
  color: rgb(var(--v-theme-primary));
}

/* 在小屏幕上允许在指定位置换行 */
@media (max-width: 420px) {
  .logo-text h2 {
    line-height: 1.3;
  }
}

.logo-text h4 {
  margin: 4px 0 0 0;
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: 0.3px;
  white-space: nowrap;
}

.logo-subtitle {
  color: rgba(var(--v-theme-on-surface), 0.7);
}

/* 响应式处理 */
@media (max-width: 520px) {
  .logo-content {
    gap: 15px;
  }
  
  .logo-text h2 {
    font-size: 1.6rem;
  }
  
  .logo-text h4 {
    font-size: 0.9rem;
  }
  
  .logo-image img {
    width: 90px;
  }
}
</style>
