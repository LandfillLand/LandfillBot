<script setup lang="ts">
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useLanguageSwitcher, useI18n } from '@/i18n/composables'
import type { Locale } from '@/i18n/types'

const display = useDisplay()
const { t } = useI18n()

const { languageOptions, switchLanguage, locale } = useLanguageSwitcher()
const currentLocale = computed(() => locale.value)

const changeLanguage = async (langCode: string) => {
  await switchLanguage(langCode as Locale)
}
</script>

<template>
  <v-menu
    :open-on-hover="!display.mobile.value"
    :open-on-click="true"
    :location="display.mobile.value ? 'bottom center' : 'start top'"
    :origin="display.mobile.value ? 'top center' : 'end top'"
    offset="12"
    :close-on-content-click="true"
    transition="scale-transition"
  >
    <template v-slot:activator="{ props: activatorProps }">
      <v-list-item v-bind="activatorProps" class="styled-menu-item" rounded="md" @click.stop>
        <template v-slot:prepend>
          <v-icon>mdi-translate</v-icon>
        </template>
        <v-list-item-title>{{ t('core.header.buttons.language') || 'Language' }}</v-list-item-title>
        <template v-slot:append>
          <v-icon size="small" color="medium-emphasis">
            {{ display.mobile.value ? 'mdi-chevron-down' : 'mdi-chevron-right' }}
          </v-icon>
        </template>
      </v-list-item>
    </template>

    <v-card class="language-dropdown" elevation="8" rounded="lg">
      <v-list density="compact" class="pa-1">
        <v-list-item
          v-for="lang in languageOptions"
          :key="lang.value"
          :value="lang.value"
          @click="changeLanguage(lang.value)"
          :class="{ 'language-item-selected': currentLocale === lang.value }"
          class="language-item"
          rounded="md"
        >
          <template v-slot:prepend>
            <span :class="['fi', `fi-${lang.flag}`, 'language-flag-styled']"></span>
          </template>
          <v-list-item-title>{{ lang.label }}</v-list-item-title>
          <template v-slot:append v-if="currentLocale === lang.value">
            <v-icon color="primary" size="small">mdi-check</v-icon>
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>

<style>
.language-dropdown {
  min-width: 100px;
  width: fit-content;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.01) !important;
  background: rgb(var(--v-theme-surface)) !important;
  backdrop-filter: blur(10px);
}

.v-theme--PurpleThemeDark .language-dropdown {
  background: rgb(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15) !important;
}

.language-item {
  margin: 2px 0;
  transition: all 0.2s ease;
  cursor: pointer;
}

.language-item:hover {
  background: rgba(var(--v-theme-primary), 0.12) !important;
}

.language-item-selected {
  background: rgba(var(--v-theme-primary), 0.16) !important;
  color: rgb(var(--v-theme-primary)) !important;
  font-weight: 600;
}

.language-item-selected:hover {
  background: rgba(var(--v-theme-primary), 0.24) !important;
}

.v-theme--PurpleThemeDark .language-item:hover {
  background: rgba(var(--v-theme-primary), 0.18) !important;
}

.v-theme--PurpleThemeDark .language-item-selected {
  background: rgba(var(--v-theme-primary), 0.24) !important;
  color: rgb(var(--v-theme-primary)) !important;
}

.v-theme--PurpleThemeDark .language-item-selected:hover {
  background: rgba(var(--v-theme-primary), 0.32) !important;
}
</style>
