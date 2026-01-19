<template>
  <v-menu v-bind="$attrs" :close-on-content-click="closeOnContentClick">
    <template v-slot:activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps"></slot>
    </template>
    
    <v-card class="styled-menu-card" elevation="8" rounded="lg">
      <v-list density="compact" class="styled-menu-list pa-1">
        <slot></slot>
      </v-list>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false
})

withDefaults(defineProps<{
  closeOnContentClick?: boolean
}>(), {
  closeOnContentClick: true
})
</script>

<style scoped>
.styled-menu-card {
  min-width: 100px;
  width: fit-content;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12) !important;
  background: rgba(var(--v-theme-surface), 0.9) !important;
  backdrop-filter: blur(10px);
}

.styled-menu-list {
  background: transparent !important;
}

:deep(.styled-menu-item) {
  margin: 2px 0;
  transition: all 0.2s ease;
  border-radius: 6px;
}

:deep(.styled-menu-item:hover) {
  background: rgba(var(--v-theme-primary), 0.10) !important;
}

:deep(.styled-menu-item-active) {
  background: rgba(var(--v-theme-primary), 0.16) !important;
  color: rgb(var(--v-theme-primary)) !important;
  font-weight: 500;
}

:deep(.styled-menu-item-active:hover) {
  background: rgba(var(--v-theme-primary), 0.24) !important;
}
</style>