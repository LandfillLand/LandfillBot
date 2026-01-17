<template>
  <v-menu offset="12" location="bottom center">
    <template v-slot:activator="{ props: activatorProps }">
      <v-btn
        v-bind="activatorProps"
        :variant="(props.variant === 'header' || props.variant === 'chatbox') ? 'flat' : 'text'"
        :color="(props.variant === 'header' || props.variant === 'chatbox') ? 'var(--v-theme-surface)' : undefined"
        :rounded="(props.variant === 'header' || props.variant === 'chatbox') ? 'sm' : undefined"
        icon
        size="small"
        :class="['language-switcher', `language-switcher--${props.variant}`, (props.variant === 'header' || props.variant === 'chatbox') ? 'action-btn' : '']"
      >
        <v-icon size="18" :color="iconColor">mdi-translate</v-icon>
      </v-btn>
    </template>
    
    <v-card class="language-dropdown" elevation="8" rounded="lg">
      <v-list density="compact" class="pa-1">
        <v-list-item
          v-for="lang in languageOptions"
          :key="lang.value"
          :value="lang.value"
          @click="changeLanguage(lang.value)"
          :class="{ 'v-list-item--active': currentLocale === lang.value, 'language-item-selected': currentLocale === lang.value }"
          class="language-item"
          rounded="md"
        >
          <template v-slot:prepend>
            <span 
              :class="['fi', `fi-${lang.flag}`, 'language-flag-styled']"
            ></span>
          </template>
          <v-list-item-title>{{ lang.label }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLanguageSwitcher } from '@/i18n/composables'
import type { Locale } from '@/i18n/types'

const props = withDefaults(defineProps<{
  variant?: 'default' | 'header' | 'chatbox'
  color?: string | undefined
}>(), {
  variant: 'default',
  color: undefined
})

const { languageOptions, switchLanguage, locale } = useLanguageSwitcher()

const iconColor = computed(() => props.color ?? (props.variant === 'default' ? 'primary' : undefined))
const currentLocale = computed(() => locale.value)

const changeLanguage = async (langCode: string) => {
  await switchLanguage(langCode as Locale)
}
</script>

<style scoped>
.language-switcher--default {
  margin: 0;
  border-radius: 50% !important;
  min-width: 32px !important;
  width: 32px !important;
  height: 32px !important;
  background: transparent !important;
  transition: background-color 0.25s ease;
}

.language-switcher--default:hover,
.language-switcher--default:focus-visible {
  background: rgba(var(--v-theme-primary), 0.16) !important;
}

:deep(.v-theme--PurpleThemeDark) .language-switcher--default:hover,
:deep(.v-theme--PurpleThemeDark) .language-switcher--default:focus-visible {
  background: rgba(var(--v-theme-primary), 0.24) !important;
}

.language-dropdown {
  min-width: 100px;
  width: fit-content;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15) !important; 
  background: rgb(var(--v-theme-surface)) !important;
  backdrop-filter: blur(10px);
}

:deep(.v-theme--PurpleThemeDark) .language-dropdown {
  background: rgb(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12) !important;
}

.language-item {
  margin: 2px 0;
  transition: all 0.2s ease;
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

:deep(.v-theme--PurpleThemeDark) .language-item:hover {
  background: rgba(var(--v-theme-primary), 0.18) !important;
}

:deep(.v-theme--PurpleThemeDark) .language-item-selected {
  background: rgba(var(--v-theme-primary), 0.24) !important;
  color: rgb(var(--v-theme-primary)) !important;
}

:deep(.v-theme--PurpleThemeDark) .language-item-selected:hover {
  background: rgba(var(--v-theme-primary), 0.32) !important;
}
</style>