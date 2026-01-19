<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted, watch } from 'vue';
import { useCustomizerStore } from '../../../stores/customizer';
import { useI18n } from '@/i18n/composables';
import sidebarItems from './sidebarItem';
import NavItem from './NavItem.vue';
import { applySidebarCustomization } from '@/utils/sidebarCustomization';
import ChangelogDialog from '@/components/shared/ChangelogDialog.vue';

const { t } = useI18n();

const customizer = useCustomizerStore();
const sidebarMenu = shallowRef(sidebarItems);

// 侧边栏分组展开状态持久化
const openedItems = ref<string[]>(
  JSON.parse(localStorage.getItem('sidebar_openedItems') || '[]') as string[]
);
watch(openedItems, (val) => localStorage.setItem('sidebar_openedItems', JSON.stringify(val)), { deep: true });

// Apply customization on mount and listen for storage changes
const handleStorageChange = (e: StorageEvent) => {
  if (e.key === 'astrbot_sidebar_customization') {
    sidebarMenu.value = applySidebarCustomization(sidebarItems);
  }
};

const handleCustomEvent = () => {
  sidebarMenu.value = applySidebarCustomization(sidebarItems);
};

onMounted(() => {
  sidebarMenu.value = applySidebarCustomization(sidebarItems);
   
  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('sidebar-customization-changed', handleCustomEvent);
});

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange);
  window.removeEventListener('sidebar-customization-changed', handleCustomEvent);
});

const starCount = ref<number | null>(null);

// 更新日志对话框
const changelogDialog = ref(false);

const sidebarWidth = ref(235);
const minSidebarWidth = 200;
const maxSidebarWidth = 300;
const isResizing = ref(false);


if (window.innerWidth < 768) {
  customizer.Sidebar_drawer = false;
}

function openLink(url?: string) {
  if (typeof window !== 'undefined') {
    let url_ = url || "https://docs.astrbot.app";
    window.open(url_, "_blank");
  }
}

function startSidebarResize(event: MouseEvent) {
  isResizing.value = true;
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'ew-resize';
   
  const startX = event.clientX;
  const startWidth = sidebarWidth.value;
   
  function onMouseMoveResize(event: MouseEvent) {
    if (!isResizing.value) return;
     
    const deltaX = event.clientX - startX;
    const newWidth = Math.max(minSidebarWidth, Math.min(maxSidebarWidth, startWidth + deltaX));
    sidebarWidth.value = newWidth;
  }
   
  function onMouseUpResize() {
    isResizing.value = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onMouseMoveResize);
    document.removeEventListener('mouseup', onMouseUpResize);
  }
   
  document.addEventListener('mousemove', onMouseMoveResize);
  document.addEventListener('mouseup', onMouseUpResize);
}

function formatNumber(num: number) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
}

async function fetchStarCount() {
  try {
    const response = await fetch('https://api.github.com/repos/AstrBotDevs/AstrBot');
    const data = await response.json();
    
    if (data && typeof data.stargazers_count === 'number') {
      starCount.value = data.stargazers_count;
      console.debug('Fetched star count:', starCount.value);
    }
  } catch (error) {
    console.debug('Failed to fetch star count:', error);
  }
}

fetchStarCount();

// 打开更新日志对话框
function openChangelogDialog() {
  changelogDialog.value = true;
}

</script>

<template>
  <v-navigation-drawer
    left
    v-model="customizer.Sidebar_drawer"
    elevation="0"
    rail-width="80"
    app
    class="leftSidebar"
    :width="sidebarWidth"
    :rail="customizer.mini_sidebar"
  >
    <div class="sidebar-container">
      <v-list class="pa-4 listitem flex-grow-1" v-model:opened="openedItems" :open-strategy="'multiple'">
        <template v-for="(item, i) in sidebarMenu" :key="i">
          <NavItem :item="item" class="leftPadding" />
        </template>
      </v-list>
      <div class="sidebar-footer" v-if="!customizer.mini_sidebar">
        <v-btn
          class="sidebar-action-btn"
          size="small"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-cog-outline"
          to="/settings"
        >
          {{ t('core.navigation.settings') }}
        </v-btn>
        
        <v-btn
          class="sidebar-action-btn"
          size="small"
          variant="text"
          prepend-icon="mdi-history"
          @click="openChangelogDialog"
        >
          {{ t('core.navigation.changelog') }}
        </v-btn>

        <v-btn
          class="sidebar-action-btn"
          size="small"
          variant="text"
          prepend-icon="mdi-book-open-variant"
          @click="openLink('https://docs.astrbot.app')"
        >
          {{ t('core.navigation.documentation') }}
        </v-btn>

        <v-btn
          class="sidebar-action-btn"
          size="small"
          variant="text"
          prepend-icon="mdi-github"
          @click="openLink('https://github.com/AstrBotDevs/AstrBot')"
        >
          <span>{{ t('core.navigation.github') }}</span>
          <v-chip
            v-if="starCount"
            size="x-small"
            variant="outlined"
            class="ml-2"
            style="font-weight: normal;"
          >{{ formatNumber(starCount) }}</v-chip>
        </v-btn>
      </div>
    </div>
     
    <div 
      v-if="!customizer.mini_sidebar && customizer.Sidebar_drawer"
      class="sidebar-resize-handle"
      @mousedown="startSidebarResize"
      :class="{ 'resizing': isResizing }"
    >
    </div>
  </v-navigation-drawer>
   
  <ChangelogDialog v-model="changelogDialog" />
</template>

<style scoped>
.sidebar-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  background: transparent;
  cursor: ew-resize;
  user-select: none;
  z-index: 1000;
  transition: background-color 0.2s ease;
}

.sidebar-resize-handle:hover,
.sidebar-resize-handle.resizing {
  background: rgba(var(--v-theme-primary), 0.3);
}

.sidebar-resize-handle::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 30px;
  background: rgba(var(--v-theme-on-surface), 0.3);
  border-radius: 1px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.sidebar-resize-handle:hover::before,
.sidebar-resize-handle.resizing::before {
  opacity: 1;
}

/* 确保侧边栏容器支持相对定位 */
.leftSidebar .v-navigation-drawer__content {
  position: relative;
}

.sidebar-action-btn {
  justify-content: flex-start;
  text-transform: none;
}

.sidebar-action-btn :deep(.v-btn__content) {
  justify-content: flex-start;
  gap: 8px;
}

.sidebar-action-btn :deep(.v-icon) {
  opacity: 0.85;
}
</style>