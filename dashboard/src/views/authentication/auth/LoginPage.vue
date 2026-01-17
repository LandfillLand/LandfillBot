<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import AuthLogin from '../authForms/AuthLogin.vue';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher.vue';
import { useModuleI18n } from '@/i18n/composables';
import { useAuthStore } from '@/stores/auth';
import { useCustomizerStore } from '@/stores/customizer';
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify';

const { tm: t } = useModuleI18n('features/auth');
const authStore = useAuthStore();
const router = useRouter();
const customizer = useCustomizerStore();
const vuetifyTheme = useTheme();

const toI18nString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return (value as Array<unknown>)
      .filter((item): item is string => typeof item === 'string')
      .join('');
  }
  return '';
};

const headerTitle = computed(() => toI18nString(t('logo.title')));
const welcomeTitle = computed(() => toI18nString(t('logo.subtitle')));

const titleChars = computed(() =>
  headerTitle.value.split('').map((char: string) => (char === ' ' ? '\u00A0' : char))
);

const isDarkTheme = computed(() => customizer.uiTheme === 'PurpleThemeDark');

const toggleTheme = () => {
  const nextTheme = isDarkTheme.value ? 'PurpleTheme' : 'PurpleThemeDark';
  customizer.SET_UI_THEME(nextTheme);
  vuetifyTheme.global.name.value = nextTheme;
};

const switchToDarkLabel = computed(() => toI18nString(t('theme.switchToDark')));
const switchToLightLabel = computed(() => toI18nString(t('theme.switchToLight')));
const themeIconColor = computed(() => 'primary');
const BASE_API_URL = 'https://api.revaea.com/pc'; 
const currentImageUrl = ref<string>(''); 
const carouselInterval = ref<any>(null);
const heroImageLoaded = ref(false);
const getFreshUrl = () => {
  const timestamp = new Date().getTime();
  const separator = BASE_API_URL.includes('?') ? '&' : '?';
  return `${BASE_API_URL}${separator}t=${timestamp}`;
};

const loadNextImage = () => {
  const nextUrl = getFreshUrl();
  const img = new Image();
  
  img.src = nextUrl;
  
  img.onload = () => {
    currentImageUrl.value = nextUrl;
    heroImageLoaded.value = true;
  };
  
  img.onerror = () => {
    console.warn('Image load failed, retrying in next cycle...');
  };
};

const startCarousel = () => {
  stopCarousel();
  if (!currentImageUrl.value) {
    loadNextImage();
  }
  
  carouselInterval.value = setInterval(loadNextImage, 10000); 
};

const stopCarousel = () => {
  if (carouselInterval.value) {
    clearInterval(carouselInterval.value);
    carouselInterval.value = null;
  }
};

function onHeroImageLoad() {
  heroImageLoaded.value = true;
}

const LOGIN_BODY_CLASS = 'login-page-locked';
const lockBodyScroll = () => document.body.classList.add(LOGIN_BODY_CLASS);
const unlockBodyScroll = () => document.body.classList.remove(LOGIN_BODY_CLASS);

onMounted(async () => {
  if (authStore.has_token()) {
    router.push(authStore.returnUrl || '/');
    return;
  }

  lockBodyScroll();
  startCarousel(); 
});

onUnmounted(() => {
  unlockBodyScroll();
  stopCarousel();
});
</script>

<template>
  <main class="mui-login">
    <div class="mui-login__container">
        <figure
          class="mui-login__visual"
          :class="{ 'is-loaded': heroImageLoaded }"
          aria-hidden="true"
        >
          <Transition name="carousel-fade">
            <img
              v-if="currentImageUrl"
              :key="currentImageUrl"
              :src="currentImageUrl"
              alt="Random Wallpaper"
              decoding="async"
              loading="eager"
              @load="onHeroImageLoad"
            >
          </Transition>

          <div class="visual-overlay"></div>

          <div class="visual-controls" role="toolbar" aria-label="Login interface controls">
            <LanguageSwitcher class="visual-controls__language" :icon-color="themeIconColor" />
            <v-divider vertical class="visual-controls__divider" />
            <v-btn
              class="visual-controls__theme-btn"
              icon
              variant="text"
              size="small"
              :aria-label="isDarkTheme ? switchToLightLabel : switchToDarkLabel"
              @click="toggleTheme"
            >
              <v-icon size="18" :color="themeIconColor">
                {{ isDarkTheme ? 'mdi-white-balance-sunny' : 'mdi-weather-night' }}
              </v-icon>
              <v-tooltip activator="parent" location="top">
                {{ isDarkTheme ? switchToLightLabel : switchToDarkLabel }}
              </v-tooltip>
            </v-btn>
          </div>
        </figure>

        <section class="mui-login__panel" aria-labelledby="loginTitle">
          <div class="mui-login__copy">
            <div class="mui-login__hero">
              <div class="header-title login-header-title">
                <img
                  src="@/assets/images/icon-no-shadow.svg"
                  alt="AstrBot Logo"
                  class="header-logo login-header-logo"
                  width="28"
                  height="28"
                  decoding="async"
                  draggable="false"
                >
                <div class="title-wrapper">
                  <div class="animated-title" role="heading" :aria-label="headerTitle">
                    <span
                      v-for="(char, index) in titleChars"
                      :key="`${char}-${index}`"
                      class="title-char"
                      :style="{ animationDelay: `${index * 0.06}s` }"
                      aria-hidden="true"
                    >{{ char }}</span>
                  </div>
                </div>
              </div>
            </div>

            <h1 id="loginTitle" class="mui-login__title">
              <v-icon size="24" class="title-icon" color="primary">mdi-emoticon-happy-outline</v-icon>
              {{ welcomeTitle }}
            </h1>
            
            <div class="mt-4">
                <AuthLogin />
            </div>
          </div>
        </section>
      </div>
  </main>
</template>

<style scoped lang="scss">
@import '@/scss/variables';

:global(body.login-page-locked) {
  font-family: $body-font-family;
  overflow: hidden;
}

.mui-login {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px 12px;
  overflow: hidden;
  background: radial-gradient(circle at top, rgba(var(--v-theme-primary), 0.15), transparent 55%),
    radial-gradient(circle at bottom, rgba(var(--v-theme-primary), 0.1), transparent 60%),
    rgb(var(--v-theme-background));
}

.mui-login__container {
  position: relative;
  display: flex;
  width: min(1040px, 100%);
  height: clamp(460px, 85vh, 520px);
  overflow: hidden;
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(16px);
}

.mui-login__visual {
  position: relative;
  z-index: 10;
  flex: 1.1;
  margin: 0;
  overflow: hidden;
  background: rgb(var(--v-theme-background)); 
}

.visual-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(10, 22, 50, 0.4), rgba(3, 9, 20, 0.2));
  z-index: 2; 
  pointer-events: none;
}

.mui-login__visual img {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.1) contrast(1.05);
  z-index: 1;
}

.carousel-fade-enter-active {
  transition: opacity 1.5s ease, transform 2s ease;
  z-index: 1;
}

.carousel-fade-leave-active {
  transition: opacity 1.5s ease;
  z-index: 0; 
}

.carousel-fade-enter-from {
  opacity: 0;
  transform: scale(1.05); 
}

.carousel-fade-leave-to {
  opacity: 0; 
}

.carousel-fade-enter-to,
.carousel-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}

.mui-login__panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  flex: 0 0 clamp(320px, 38vw, 420px);
  z-index: 0;
  max-width: 45%;
  padding: 32px 36px;
  background: rgb(var(--v-theme-surface));
  backdrop-filter: blur(20px);
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  color: rgb(var(--v-theme-on-surface));
  text-align: left;
  opacity: 0;
  transform: translate3d(0, 24px, 0) scale(0.985);
  filter: blur(14px);
  animation: login-panel-reveal 0.9s cubic-bezier(0.17, 0.84, 0.44, 1) 0.08s forwards,
    login-panel-glow 2.4s cubic-bezier(0.4, 0, 0.2, 1) 0.08s forwards;
  will-change: transform, opacity, filter;
}

.mui-login__copy {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.visual-controls {
  position: absolute;
  bottom: 24px;
  left: 24px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 50px;
  background: rgba(var(--v-theme-surface), 0.85);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(12px);
  z-index: 10;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
}

.visual-controls:hover {
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

.visual-controls__divider {
  align-self: stretch;
  margin: 0 4px;
  border-color: rgba(var(--v-theme-on-surface), 0.12) !important;
  opacity: 0.65 !important;
}

.visual-controls__theme-btn {
  border-radius: 50% !important;
  min-width: 32px !important;
  width: 32px !important;
  height: 32px !important;
  background: transparent !important;
  transition: background-color 0.25s ease;
}

.visual-controls__theme-btn:hover {
  background: rgba(var(--v-theme-primary), 0.16) !important;
}

.visual-controls :deep(.language-switcher--default) {
  background: transparent !important;
  transition: transform 0.25s ease, background-color 0.25s ease;
}

.visual-controls :deep(.language-switcher--default:hover) {
  transform: scale(1.06);
  background: rgba(var(--v-theme-primary), 0.16) !important;
}

.mui-login__hero {
  margin-bottom: 6px;
}

.login-header-title {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

.header-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}

.title-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 28px;
}

.animated-title {
  display: inline-flex;
  align-items: center;
  gap: 0;
  font-family: $body-font-family;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: rgb(var(--v-theme-on-surface));
}

.title-char {
  display: inline-block;
  opacity: 0;
  transform: translateY(10px);
  animation: title-char-reveal 0.4s cubic-bezier(0.33, 1, 0.68, 1) forwards;
}

@keyframes title-char-reveal {
  0% {
    transform: translateY(10px);
    opacity: 0;
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes login-panel-reveal {
  0% {
    opacity: 0;
    transform: translate3d(0, 28px, 0) scale(0.975);
    filter: blur(20px);
  }
  60% {
    opacity: 1;
    transform: translate3d(0, -6px, 0) scale(1.005);
    filter: blur(4px);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
    filter: blur(0);
  }
}

@keyframes login-panel-glow {
  0% {
    box-shadow: 0 18px 40px rgba(13, 42, 96, 0);
  }
  70% {
    box-shadow: 0 24px 45px rgba(13, 42, 96, 0.25);
  }
  100% {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }
}

.mui-login__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0 2px;
  font-family: $body-font-family;
  font-size: clamp(20px, 3vw, 26px);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.title-icon {
  color: rgb(var(--v-theme-primary));
  flex-shrink: 0;
}

@media (max-height: 600px) {
  .mui-login {
    padding: 0;
  }

  .mui-login__container {
    width: 100%;
    height: 100vh;
    height: 100dvh;
    border-radius: 0;
    border: none;
  }

  .mui-login__panel {
    padding: 24px 32px;
    animation-duration: 0.75s, 1.9s;
  }

  .mui-login__copy {
    gap: 8px;
  }

  .mui-login__title {
    font-size: 20px;
    margin: 2px 0;
  }
}

@media (max-width: 640px) {
  .mui-login {
    padding: 0;
  }

  .mui-login__container {
    flex-direction: column;
    width: 100%;
    height: 100vh;
    height: 100dvh;
    min-height: unset;
    border-radius: 0;
    border: none;
  }

  .mui-login__visual {
    flex: 0 0 35vh;
    height: 35vh;
    z-index: 10;
  }

  .mui-login__panel {
    flex: 1;
    max-width: none;
    padding: 28px 24px 32px;
    border-left: 0;
    border-radius: 0;
    overflow-y: auto;
    animation-duration: 0.8s, 2s;
    position: relative;
    background: rgba(var(--v-theme-surface), 0.85);
    z-index: 0;

    :deep(.v-btn--variant-elevated),
    :deep(button[type="submit"]) {
      width: 100% !important;      
      display: flex !important;         
      justify-content: center;   
      margin-top: 20px !important;  
    }
  }

  .mui-login__copy {
    gap: 10px;
  }

  .login-header-title {
    flex-direction: row;
    gap: 10px;
    align-items: center;
  }

  .header-logo {
    width: 24px;
    height: 24px;
  }

  .title-wrapper {
    flex-direction: row;
    height: 24px;
    gap: 8px;
  }

  .animated-title {
    font-size: 0.9rem;
  }

  .mui-login__hero {
    margin-bottom: 6px;
  }

  .mui-login__title {
    font-size: 22px;
    margin: 4px 0 2px;
  }

  .visual-controls {
    bottom: 16px;
    left: 16px;
    gap: 6px;
    padding: 6px 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mui-login__panel {
    animation: none;
    opacity: 1;
    transform: none;
    filter: none;
  }

  .carousel-fade-enter-active,
  .carousel-fade-leave-active {
    transition: none;
  }
}
</style>
