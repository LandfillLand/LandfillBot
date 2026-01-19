<template>
  <v-card class="provider-sources-panel h-100" :class="{ 'is-dark': isDark }" elevation="0">
    
    <div class="provider-sources-header d-flex align-center justify-space-between px-4 pt-4 pb-2">
      <div class="d-flex align-center ga-2">
        <h3 class="mb-0">{{ tm('providerSources.title') }}</h3>
      </div>
      <v-menu>
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            prepend-icon="mdi-plus"
            color="primary"
            variant="tonal"
            rounded="xl"
            size="small"
          >
            {{ tm('providerSources.add') }}
          </v-btn>
        </template>
        <v-list density="compact">
          <v-list-item
            v-for="sourceType in availableSourceTypes"
            :key="sourceType.value"
            @click="emitAddSource(sourceType.value)"
          >
            <v-list-item-title>{{ sourceType.label }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>

    <div v-if="displayedProviderSources.length > 0">
      <v-list class="provider-source-list" nav density="compact" lines="two">
        <v-list-item
          v-for="source in displayedProviderSources"
          :key="source.isPlaceholder ? `template-${source.templateKey}` : source.id"
          :value="source.id"
          :active="isActive(source)"
          :class="['provider-source-list-item', { 'provider-source-list-item--active': isActive(source) }]"
          rounded="lg"
          @click="emitSelectSource(source)"
        >
          <template #prepend>
            <v-avatar size="32" variant="text" rounded="0">
              <v-img 
                v-if="source?.provider" 
                :src="resolveSourceIcon(source)" 
                class="provider-icon" 
                alt="logo" 
                contain
              ></v-img>
              <v-icon v-else size="32" color="medium-emphasis">mdi-creation</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-bold">{{ getSourceDisplayName(source) }}</v-list-item-title>
          <v-list-item-subtitle class="text-truncate">{{ source.api_base || 'N/A' }}</v-list-item-subtitle>
          
          <template #append>
            <div class="d-flex align-center ga-1">
              <v-btn
                v-if="!source.isPlaceholder"
                icon="mdi-delete"
                variant="text"
                size="x-small"
                color="error"
                @click.stop="emitDeleteSource(source)"
              ></v-btn>
            </div>
          </template>
        </v-list-item>
      </v-list>
    </div>
    <div v-else class="text-center py-8 px-4">
      <v-icon size="48" color="grey-lighten-1">mdi-api-off</v-icon>
      <p class="text-grey mt-2">{{ tm('providerSources.empty') }}</p>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import { useTheme } from 'vuetify' // 引入 useTheme

const props = defineProps({
  displayedProviderSources: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  selectedProviderSource: {
    type: Object as PropType<any>,
    default: null
  },
  availableSourceTypes: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  tm: {
    type: Function,
    required: true
  },
  resolveSourceIcon: {
    type: Function,
    required: true
  },
  getSourceDisplayName: {
    type: Function,
    required: true
  }
})

const emit = defineEmits([
  'add-provider-source',
  'select-provider-source',
  'delete-provider-source'
])

// 获取当前主题状态
const theme = useTheme()
const isDark = computed(() => theme.global.current.value.dark)

const selectedId = computed(() => props.selectedProviderSource?.id || null)

const isActive = (source: any) => {
  if (source.isPlaceholder) return false
  return selectedId.value !== null && selectedId.value === source.id
}

const emitAddSource = (type: unknown) => emit('add-provider-source', type)
const emitSelectSource = (source: unknown) => emit('select-provider-source', source)
const emitDeleteSource = (source: unknown) => emit('delete-provider-source', source)
</script>

<style scoped>
.provider-sources-panel {
  min-height: 320px;
  transition: none !important;
  animation: none !important;
}

.provider-sources-panel::before,
.provider-sources-panel::after,
.provider-sources-panel :deep(.v-card__overlay),
.provider-sources-panel :deep(.v-card__underlay),
.provider-sources-header,
.provider-sources-header :deep(*),
.provider-sources-header :deep(*::before),
.provider-sources-header :deep(*::after),
.provider-source-list-item,
.provider-source-list :deep(.v-list-item__overlay),
.provider-source-list :deep(.v-list-item__underlay) {
  transition: none !important;
  animation: none !important;
}

.provider-source-list {
  max-height: calc(100vh - 335px);
  overflow-y: auto;
  padding: 6px 8px;
}

/* 默认状态下的图标 */
.provider-icon {
  opacity: 0.8;
  /* 如果希望列表里的图标也像卡片一样平时是黑白的，可以把下面这行注释取消 */
  /* filter: grayscale(100%); */
}

.provider-sources-panel.is-dark .provider-icon {
  filter: grayscale(100%) invert(1);
  opacity: 0.9;
}

.provider-source-list-item--active {
  background-color: rgba(var(--v-theme-primary), 0.01) !important;
  color: rgb(var(--v-theme-primary)) !important;
}

.provider-sources-panel.is-dark .provider-source-list-item--active {
  background-color: rgba(var(--v-theme-primary), 0.01) !important;
  border-color: rgba(var(--v-theme-primary), 0.4) !important;
}

@media (max-width: 960px) {
  .provider-source-list {
    max-height: none;
  }

  .provider-sources-panel {
    min-height: auto;
  }
}
</style>
