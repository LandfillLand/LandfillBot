<template>
  <item-card
    :item="stat"
    class="stat-card uptime-card"
    :class="{ 'is-dark': isDark }"
    :hide-header="true"
    variant="text"
  >
    <template #item-details>
      <div class="d-flex align-start content-wrapper">
        <div class="icon-wrapper">
          <v-icon icon="mdi-clock-outline" size="24"></v-icon>
        </div>
        
        <div class="stat-content">
          <div class="stat-title">{{ t('stats.runningTime.title') }}</div>
          <div class="stat-value-wrapper">
            <h2 class="stat-value">{{ formattedTime }}</h2>
          </div>
          <div class="stat-subtitle">{{ t('stats.runningTime.subtitle') }}</div>
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
  name: 'RunningTime',
  components: { ItemCard },
  props: ['stat'],
  setup() {
    const { tm: t } = useModuleI18n('features/dashboard');
    const theme = useTheme();
    const isDark = computed(() => theme.global.current.value.dark);

    return { t, isDark };
  },
  computed: {
    formattedTime() {
      if (!this.stat?.running) {
        return this.t('status.loading');
      }

      const { hours, minutes, seconds } = this.stat.running;
      return this.t('stats.runningTime.format', {
        hours,
        minutes,
        seconds
      });
    }
  }
};
</script>

<style scoped>
.stat-card {
  --card-text: #2e7d32; 
  --card-border: rgba(76, 175, 80, 0.2);
  --icon-bg: rgba(76, 175, 80, 0.1);
  --hover-border: rgba(76, 175, 79, 0.988);
  --hover-shadow: rgba(76, 175, 80, 0.15);
}

.stat-card.is-dark {
  --card-text: #b9f6ca;
  --card-border: rgba(185, 246, 202, 0.3);
  --hover-border: rgba(185, 246, 202, 0.8);
  --icon-bg: rgba(185, 246, 202, 0.1);
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
  background: rgba(76, 175, 80, 0.08) !important;
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
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--card-text);
}

.stat-subtitle {
  font-size: 12px;
  opacity: 0.7;
  color: var(--card-text);
}
  
.uptime-card :deep(.v-card-title),
.uptime-card :deep(.v-card-actions) {
  display: none;
}
</style>
