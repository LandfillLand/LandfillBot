<template>
  <v-card 
    class="item-card hover-elevation" 
    elevation="0"
    v-bind="$attrs" 
  >
    <v-card-title v-if="!hideHeader" class="d-flex justify-space-between align-center pb-1 pt-3 flex-shrink-0">
      <span :class="['text-truncate', titleClass]" :title="getItemTitle()">{{ getItemTitle() }}</span>
      
      <v-tooltip location="top" v-if="showSwitch">
        <template v-slot:activator="{ props }">
          <v-switch
            color="primary"
            hide-details
            density="compact"
            :model-value="getItemEnabled()"
            :loading="loading"
            :disabled="loading"
            v-bind="props"
            @update:model-value="toggleEnabled"
          ></v-switch>
        </template>
        <span>{{ getItemEnabled() ? t('core.common.itemCard.enabled') : t('core.common.itemCard.disabled') }}</span>
      </v-tooltip>
    </v-card-title>

    <v-card-text 
      :class="[{'pa-0': noPadding}, 'flex-grow-1 d-flex flex-column']"
      style="overflow: hidden; min-height: 0;"
    >
      <slot name="item-details" :item="item"></slot>
    </v-card-text>

    <v-card-actions
      v-if="!hideHeader"
      :class="['flex-shrink-0 align-center', wrapActions ? 'flex-wrap ga-2' : '']"
      style="margin: 8px;"
    >
      
      <slot name="footer-start" :item="item"></slot>
      
      <v-spacer></v-spacer>
      
      <slot name="actions" :item="item"></slot>
      
      <v-btn
        v-if="showCopyButton"
        variant="tonal"
        color="secondary"
        size="small"
        rounded="xl"
        :disabled="loading"
        @click.stop="$emit('copy', item)"
      >
        {{ t('core.common.itemCard.copy') }}
      </v-btn>

      <v-btn
        v-if="showEditButton"
        variant="tonal"
        color="primary"
        size="small"
        rounded="xl"
        :disabled="loading"
        @click.stop="$emit('edit', item)"
      >
        {{ t('core.common.itemCard.edit') }}
      </v-btn>

      <v-btn
        v-if="showDeleteButton"
        variant="outlined"
        color="error"
        size="small"
        rounded="xl"
        :disabled="loading"
        @click.stop="$emit('delete', item)"
      >
        {{ t('core.common.itemCard.delete') }}
      </v-btn>
    </v-card-actions>

    <div class="d-flex justify-end align-center" style="position: absolute; bottom: 16px; right: 16px; opacity: 0.2; pointer-events: none;" v-if="bglogo">
      <v-img
        :src="bglogo"
        contain
        width="120"
        height="120"
      ></v-img>
    </div>
  </v-card>
</template>

<script lang="ts">
import { useI18n } from '@/i18n/composables';

export default {
  name: 'ItemCard',
  setup() {
    const { t } = useI18n();
    return { t };
  },
  props: {
    item: { type: Object, required: true },
    titleField: { type: String, default: 'id' },
    enabledField: { type: String, default: 'enable' },
    bglogo: { type: String, default: null },
    loading: { type: Boolean, default: false },
    showCopyButton: { type: Boolean, default: false },
    hideHeader: { type: Boolean, default: false },
    noPadding: { type: Boolean, default: false },
    showSwitch: { type: Boolean, default: true },
    titleClass: { type: String, default: 'text-h6' },
    showEditButton: { type: Boolean, default: true },
    showDeleteButton: { type: Boolean, default: true },
    wrapActions: { type: Boolean, default: false }
  },
  emits: ['toggle-enabled', 'delete', 'edit', 'copy'],
  methods: {
    getItemTitle() { return this.item[this.titleField]; },
    getItemEnabled() { return this.item[this.enabledField]; },
    toggleEnabled() { this.$emit('toggle-enabled', this.item); }
  }
}
</script>

<style scoped>
.item-card {
  position: relative;
  border-radius: 16px; 
  transition: all 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  border: 3px solid rgba(var(--v-theme-border), var(--v-theme-border-opacity, 1));
  color: rgba(var(--v-theme-primaryText));
  opacity: 0.8;
}

.hover-elevation:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 20px -8px rgba(var(--v-theme-primary), 0.15);
  color: rgba(var(--v-theme-primary));
  opacity: 1;
  border-color: rgb(var(--v-theme-primary));
}
</style>