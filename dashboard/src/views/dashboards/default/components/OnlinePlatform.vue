<template>
  <item-card
    :item="stat"
    class="stat-card platform-card stat-item-card"
    :class="{ 'is-dark': isDark }"
    :hide-header="true"
    variant="text"
  >
    <template #item-details="{ item }">
      <div class="d-flex align-start content-wrapper">
        <div class="icon-wrapper">
          <v-icon icon="mdi-server-network" size="24"></v-icon>
        </div>

        <div class="stat-content">
          <div class="stat-title">{{ t('stats.onlinePlatform.title') }}</div>
          <div class="stat-value-wrapper">
            <h2 class="stat-value">{{ stat.platform_count || 0 }}</h2>
          </div>
          <div class="stat-subtitle">{{ t('stats.onlinePlatform.subtitle') }}</div>
        </div>
      </div>
    </template>
  </item-card>
</template>

<script lang="ts">
import { computed } from 'vue';
import { useTheme } from 'vuetify'; 
import { useModuleI18n } from '@/i18n/composables';
import ItemCard from '@/components/shared/ItemCard.vue';

export default {
  name: 'OnlinePlatform',
  components: { ItemCard },
  props: ['stat'],
  setup() {
    const { tm: t } = useModuleI18n('features/dashboard');
    const theme = useTheme();
    const isDark = computed(() => theme.global.current.value.dark);
    return { t, isDark };
  }
};
</script>

<style scoped>
.stat-card {
  --custom-text: #5e35b1; 
  --custom-text-muted: rgba(94, 53, 177, 0.7);
  --custom-border: rgba(94, 53, 177, 0.2);
  --custom-bg-hover: rgba(94, 53, 177, 0.05);
  --icon-bg: rgba(94, 53, 177, 0.1);
}

.stat-card.is-dark {
  --custom-text: #bca3eb;
  --custom-text-muted: rgba(209, 196, 233, 0.7);
  --custom-border: rgba(209, 196, 233, 0.3);
  --custom-bg-hover: rgba(209, 196, 233, 0.1);
  --icon-bg: rgba(209, 196, 233, 0.15);
}

.stat-card {
  height: 100%;
  position: relative;
  border-radius: 16px;
  border: 3px solid var(--custom-border) !important;
  color: var(--custom-text) !important;
  background: transparent !important;
  
  transition: all 0.2s ease;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-2px);
  background: var(--custom-bg-hover) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  border-color: var(--custom-text) !important; 
}

.content-wrapper {
  padding: 16px; 
  height: 100%;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  margin-right: 16px;
  background: var(--icon-bg);
  color: var(--custom-text);
}

.stat-content { flex: 1; }

.stat-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--custom-text);
  margin-bottom: 4px;
}

.stat-value-wrapper { display: flex; align-items: baseline; margin-bottom: 4px; }
.stat-value { 
  font-size: 32px; 
  font-weight: 600; 
  line-height: 1.2; 
  margin-right: 8px; 
  color: var(--custom-text); 
}

.stat-subtitle {
  font-size: 12px;
  color: var(--custom-text-muted);
}

.stat-item-card :deep(.v-card-title), 
.stat-item-card :deep(.v-card-actions) { 
  display: none; 
}
</style>
