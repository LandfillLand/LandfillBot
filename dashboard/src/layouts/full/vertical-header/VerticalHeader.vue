<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useCustomizerStore } from '@/stores/customizer';
import axios from 'axios';
import { useCommonStore } from '@/stores/common';
import { useI18n } from '@/i18n/composables';
import { router } from '@/router';
import { useRoute } from 'vue-router';
import { useTheme } from 'vuetify';
import StyledMenu from '@/components/shared/StyledMenu.vue';
import AboutPage from '@/views/AboutPage.vue';
import UpdateDialog from '@/components/header/UpdateDialog.vue';
import AccountDialog from '@/components/header/AccountDialog.vue';
import LanguageMenu from '@/components/header/LanguageMenu.vue';


const customizer = useCustomizerStore();
const theme = useTheme();
const { t } = useI18n();
const route = useRoute();
let dialog = ref(false);
let accountWarning = ref(false)
let updateStatusDialog = ref(false);
let aboutDialog = ref(false);
let hasNewVersion = ref(false);
let botCurrVersion = ref('');
let dashboardHasNewVersion = ref(false);
let dashboardCurrentVersion = ref('');

function getVersion() {
  axios.get('/api/stat/version')
    .then((res) => {
      botCurrVersion.value = "v" + res.data.data.version;
      dashboardCurrentVersion.value = res.data.data?.dashboard_version;
      let change_pwd_hint = res.data.data?.change_pwd_hint;
      if (change_pwd_hint) {
        dialog.value = true;
        accountWarning.value = true;
        localStorage.setItem('change_pwd_hint', 'true');
      } else {
        localStorage.removeItem('change_pwd_hint');
      }
    })
    .catch((err) => {
      console.log(err);
    });
}

function openUpdateDialog() {
  updateStatusDialog.value = true
}

function toggleDarkMode() {
  const newTheme = customizer.uiTheme === 'PurpleThemeDark' ? 'PurpleTheme' : 'PurpleThemeDark';
  customizer.SET_UI_THEME(newTheme);
  theme.global.name.value = newTheme;
}

function handleLogoClick() {
  if (customizer.viewMode === 'chat') {
    aboutDialog.value = true;
  } else {
    router.push('/about');
  }
}

getVersion();

const commonStore = useCommonStore();
commonStore.getStartTime();

// 视图模式切换
const viewMode = computed({
  get: () => customizer.viewMode,
  set: (value: 'bot' | 'chat') => {
    customizer.SET_VIEW_MODE(value);
  }
});

function syncViewModeFromRoute(path: string) {
  const routeMode: 'bot' | 'chat' = path.startsWith('/chat') ? 'chat' : 'bot'
  if (customizer.viewMode !== routeMode) {
    customizer.SET_VIEW_MODE(routeMode)
  }
}

onMounted(() => {
  syncViewModeFromRoute(route.path)
})

watch(
  () => route.path,
  (newPath) => {
    syncViewModeFromRoute(newPath)
  }
)

// 监听 viewMode 变化，切换到 bot 模式时跳转到首页
watch(() => customizer.viewMode, (newMode, oldMode) => {
  if (newMode === 'bot' && oldMode === 'chat') {
    // 从 chat 模式切换到 bot 模式时，跳转到首页
    if (route.path !== '/') {
      router.push('/');
    }
  } else if (newMode === 'chat' && oldMode === 'bot') {
    // 从 bot 模式切换到 chat 模式时，跳转到 chat 页面
    if (!route.path.startsWith('/chat')) {
      router.push('/chat');
    }
  }
});

// Merry Christmas! 🎄
const isChristmas = computed(() => {
  const today = new Date();
  const month = today.getMonth() + 1; // getMonth() 返回 0-11
  const day = today.getDate();
  return month === 12 && day === 25;
});

</script>

<template>
  <v-app-bar elevation="0" height="55" class="header-with-border">

    <v-btn v-if="customizer.viewMode === 'bot' && useCustomizerStore().uiTheme === 'PurpleTheme'" style="margin-left: 16px;"
      class="hidden-md-and-down"  icon rounded="sm" variant="flat"
      @click.stop="customizer.SET_MINI_SIDEBAR(!customizer.mini_sidebar)">
      <v-icon>mdi-menu</v-icon>
    </v-btn>
    <v-btn v-else-if="customizer.viewMode === 'bot'"
      style="margin-left: 22px;"
      class="hidden-md-and-down" icon rounded="sm" variant="flat"
      @click.stop="customizer.SET_MINI_SIDEBAR(!customizer.mini_sidebar)">
      <v-icon>mdi-menu</v-icon>
    </v-btn>
    <v-btn v-if="customizer.viewMode === 'bot' && useCustomizerStore().uiTheme === 'PurpleTheme'" class="hidden-lg-and-up ms-3"
      icon rounded="sm" variant="flat" @click.stop="customizer.SET_SIDEBAR_DRAWER">
      <v-icon>mdi-menu</v-icon>
    </v-btn>
    <v-btn v-else-if="customizer.viewMode === 'bot'" class="hidden-lg-and-up ms-3" icon rounded="sm" variant="flat"
      @click.stop="customizer.SET_SIDEBAR_DRAWER">
      <v-icon>mdi-menu</v-icon>
    </v-btn>

    <div class="logo-container" :class="{ 'mobile-logo': $vuetify.display.xs, 'chat-mode-logo': customizer.viewMode === 'chat' }" @click="handleLogoClick">
      <span class="logo-text Outfit" style="position: relative;">
          Nebula
          <img v-if="isChristmas" src="@/assets/images/xmas-hat.png" alt="Christmas hat" class="xmas-hat" />
      </span>
      <span class="logo-text logo-text-light Outfit" style="color: grey;" v-if="customizer.viewMode === 'chat'">ChatUI</span>
      <span class="version-text hidden-xs">{{ botCurrVersion }}</span>
    </div>

  <v-spacer />

    <div class="mr-4 hidden-xs">
      <small v-if="hasNewVersion">
        {{ t('core.header.version.hasNewVersion') }}
      </small>
      <small v-else-if="dashboardHasNewVersion">
        {{ t('core.header.version.dashboardHasNewVersion') }}
      </small>
    </div>
    
    <v-btn-toggle
      v-model="viewMode"
      mandatory
      variant="outlined"
      density="compact"
      class="mr-4"
      color="primary"
    >
      <v-btn value="bot" size="small">
        <v-icon start>mdi-robot</v-icon>
        Bot
      </v-btn>
      <v-btn value="chat" size="small">
        <v-icon start>mdi-chat</v-icon>
        Chat
      </v-btn>
    </v-btn-toggle>


    <StyledMenu offset="12" location="bottom end">
      <template v-slot:activator="{ props: activatorProps }">
        <v-btn
          v-bind="activatorProps"
          size="small"
          class="action-btn mr-4"
          color="var(--v-theme-surface)"
          variant="flat"
          rounded="sm"
          icon
        >
          <v-icon>mdi-dots-vertical</v-icon>
        </v-btn>
      </template>

      <LanguageMenu />

      <v-list-item
        @click="toggleDarkMode()"
        class="styled-menu-item"
        rounded="md"
      >
        <template v-slot:prepend>
          <v-icon>
            {{ useCustomizerStore().uiTheme === 'PurpleThemeDark' ? 'mdi-weather-night' : 'mdi-white-balance-sunny' }}
          </v-icon>
        </template>
        <v-list-item-title>
          {{ useCustomizerStore().uiTheme === 'PurpleThemeDark' ? t('core.header.buttons.theme.light') : t('core.header.buttons.theme.dark') }}
        </v-list-item-title>
      </v-list-item>

      <v-list-item
        @click="openUpdateDialog"
        class="styled-menu-item"
        rounded="md"
      >
        <template v-slot:prepend>
          <v-icon>mdi-arrow-up-circle</v-icon>
        </template>
        <v-list-item-title>{{ t('core.header.updateDialog.title') }}</v-list-item-title>
        <template v-slot:append v-if="hasNewVersion || dashboardHasNewVersion">
          <v-chip size="x-small" color="primary" variant="tonal" class="ml-2">!</v-chip>
        </template>
      </v-list-item>

      <v-list-item
        @click="dialog = true"
        class="styled-menu-item"
        rounded="md"
      >
        <template v-slot:prepend>
          <v-icon>mdi-account</v-icon>
        </template>
        <v-list-item-title>{{ t('core.header.accountDialog.title') }}</v-list-item-title>
      </v-list-item>
    </StyledMenu>

    <UpdateDialog
      v-model="updateStatusDialog"
      :bot-curr-version="botCurrVersion"
      :dashboard-current-version="dashboardCurrentVersion"
      @update-flags="(v) => { hasNewVersion = v.hasNewVersion; dashboardHasNewVersion = v.dashboardHasNewVersion }"
    />

    <AccountDialog v-model="dialog" :warning="accountWarning" />

    <v-dialog v-model="aboutDialog"
      width="600">
      <v-card>
        <v-card-text style="overflow-y: auto;">
          <AboutPage />
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app-bar>
</template>

<style>
.header-with-border {
  border-bottom: 1px solid rgba(var(--v-theme-border), 0.5) !important;
}

.logo-container {
  margin-left: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.mobile-logo {
  margin-left: 8px;
  gap: 4px;
}

.chat-mode-logo {
  margin-left: 22px;
}

.logo-text {
  font-size: 24px;
  font-weight: 1000;
}

.logo-text-light {
  font-weight: normal;
}

.bot-text-wrapper {
  position: relative;
  display: inline-block;
}

.xmas-hat {
  position: absolute;
  top: -3px;
  right: -14px;
  width: 24px;
  height: 24px;
  z-index: 1;
}

.version-text {
  font-size: 12px;
  color: gray;
  margin-left: 4px;
}

.action-btn {
  margin-right: 6px;
}

/* 移动端样式优化 */
@media (max-width: 600px) {
  .logo-text {
    font-size: 20px;
  }

  .action-btn {
    margin-right: 4px;
    min-width: 32px !important;
    width: 32px;
  }

  .v-card-title {
    padding: 12px 16px;
  }

  .v-card-text {
    padding: 16px;
  }

  .v-tabs .v-tab {
    padding: 0 10px;
    font-size: 0.9rem;
  }

  /* 移动端模式切换按钮样式 */
  .v-btn-toggle {
    margin-right: 8px;
  }

  .v-btn-toggle .v-btn {
    font-size: 0.75rem;
    padding: 0 8px;
  }

  .v-btn-toggle .v-icon {
    font-size: 16px;
  }
}
</style>