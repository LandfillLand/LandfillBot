<template>
  <item-card
    :item="stat"
    class="stat-card memory-card"
    :class="{ 'is-dark': isDark }"
    :hide-header="true"
    variant="text"
  >
    <template #item-details>
      <div class="d-flex align-start content-wrapper">
        <div class="icon-wrapper">
          <v-icon icon="mdi-memory" size="24"></v-icon>
        </div>
        
        <div class="stat-content">
          <div class="stat-title">{{ t('stats.memoryUsage.title') }}</div>
          
          <div class="stat-value-wrapper">
            <h2 class="stat-value">
              {{ stat.memory?.process || 0 }} 
              <span class="memory-unit">MiB / {{ stat.memory?.system || 0 }} MiB</span>
            </h2>
          </div>

          <div class="metrics-row">
            <v-chip :color="memoryStatus.color" size="x-small" variant="tonal" class="status-chip">
              {{ memoryStatus.label }}
            </v-chip>
            <div class="cpu-metric">
              <span class="metric-label">{{ t('stats.memoryUsage.cpuLoad') }}:</span>
              <span class="metric-value">{{ stat.cpu_percent || '0' }}%</span>
            </div>
          </div>
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
  name: 'MemoryUsage',
  components: { ItemCard },
  props: ['stat'],
  setup() {
    const { tm: t } = useModuleI18n('features/dashboard');
    const theme = useTheme();
    const isDark = computed(() => theme.global.current.value.dark);

    return { t, isDark };
  },
  computed: {
    memoryPercentage() {
      if (!this.stat.memory || !this.stat.memory.process || !this.stat.memory.system) return 0;
      return Math.round((this.stat.memory.process / this.stat.memory.system) * 100);
    },
    memoryStatus() {
      const percentage = this.memoryPercentage;
      if (percentage < 30) {
        return { color: 'success', label: this.t('stats.memoryUsage.status.good') };
      } else if (percentage < 70) {
        return { color: 'warning', label: this.t('stats.memoryUsage.status.normal') };
      } else {
        return { color: 'error', label: this.t('stats.memoryUsage.status.high') };
      }
    }
  }
};
</script>

<style scoped>
.stat-card {
  --card-text: #ef6c00; 
  --card-border: rgba(255, 152, 0, 0.2);
  --icon-bg: rgba(255, 152, 0, 0.1);
  --hover-border: rgb(255, 153, 0);
  --hover-shadow: rgba(255, 152, 0, 0.15);
  --metric-bg: rgba(255, 152, 0, 0.05);
}

.stat-card.is-dark {
  --card-text: #ffcc80;
  --card-border: rgba(255, 204, 128, 0.3);
  --hover-border: rgba(255, 204, 128, 0.8);
  --icon-bg: rgba(255, 204, 128, 0.1);
  --metric-bg: rgba(255, 204, 128, 0.05);
}

.stat-card {
  height: 100%;
  position: relative;
  border-radius: 16px;
  border: 3px solid var(--card-border) !important;
  background: transparent !important;
  color: var(--card-text) !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transition: all 0.2s ease;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: var(--hover-border) !important;
  box-shadow: 0 4px 16px var(--hover-shadow) !important;
  background: rgba(255, 152, 0, 0.08) !important;
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
  color: var(--card-text);
}

.stat-content {
  flex: 1;
}

.stat-title {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.9;
  margin-bottom: 4px;
  color: var(--card-text);
}

.stat-value-wrapper {
  display: flex;
  align-items: baseline;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--card-text);
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
}

.memory-unit {
  font-size: 14px;
  font-weight: 400;
  opacity: 0.8;
  margin-left: 6px;
}

.metrics-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cpu-metric {
  display: flex;
  align-items: center;
  font-size: 12px;
  background: var(--metric-bg);
  padding: 2px 8px;
  border-radius: 4px;
}

.metric-label {
  opacity: 0.8;
  margin-right: 4px;
}

.metric-value {
  font-weight: 600;
}

.memory-card :deep(.v-card-title),
.memory-card :deep(.v-card-actions) {
  display: none;
}
</style>
