<template>
  <item-card 
    :item="stat" 
    class="stat-card message-card stat-item-card"
    :class="{ 'is-dark': isDark }" 
    :hide-header="true"
    variant="text" 
  >
    <template #item-details="{ item }">
      <div class="d-flex align-start content-wrapper">
        <div class="icon-wrapper">
          <v-icon icon="mdi-message-text-outline" size="24"></v-icon>
        </div>

        <div class="stat-content">
          <div class="stat-title">{{ t('stats.totalMessage.title') }}</div>
          <div class="stat-value-wrapper">
            <h2 class="stat-value">{{ formattedCount }}</h2>
            <v-chip v-if="stat.daily_increase" class="trend-chip" size="x-small" color="success" variant="flat">
              +{{ stat.daily_increase }}
            </v-chip>
          </div>
          <div class="stat-subtitle">{{ t('stats.totalMessage.subtitle') }}</div>
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
  name: 'TotalMessage',
  components: { ItemCard },
  props: ['stat'],
  setup() {
    const { tm: t } = useModuleI18n('features/dashboard');
    const theme = useTheme();
    const isDark = computed(() => theme.global.current.value.dark);

    return { t, isDark };
  },
  computed: {
    formattedCount() {
      const count = this.stat?.message_count;
      return count ? count.toLocaleString() : '0';
    }
  }
};
</script>

<style scoped>
.stat-card {
  --card-text: rgb(var(--v-theme-darkprimary)); 
  --card-border: rgba(var(--v-theme-primary), 0.15);
  --icon-bg: rgba(var(--v-theme-primary), 0.1);
  --hover-border: rgba(var(--v-theme-primary), 1);
  --hover-shadow: rgba(var(--v-theme-primary), 0.15);
}

.stat-card.is-dark {
  --card-text: rgb(var(--v-theme-primary));
  --card-border: rgba(var(--v-theme-primary), 0.25);
  --hover-border: rgba(var(--v-theme-primary), 0.8);
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
  background: rgba(var(--v-theme-primary), 0.08) !important;
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
  color: rgb(var(--v-theme-primary));
}

.stat-content { flex: 1; }

.stat-title { 
  font-size: 14px; 
  font-weight: 500; 
  opacity: 0.9; 
  margin-bottom: 4px;
  color: var(--card-text);
}

.stat-value-wrapper { display: flex; align-items: baseline; margin-bottom: 4px; }

.stat-value { 
  font-size: 32px; 
  font-weight: 600; 
  line-height: 1.2; 
  margin-right: 8px; 
  color: var(--card-text);
}

.stat-subtitle { 
  font-size: 12px; 
  opacity: 0.7; 
  color: var(--card-text);
}

.stat-item-card :deep(.v-card-title), 
.stat-item-card :deep(.v-card-actions) { 
  display: none; 
}
</style>
