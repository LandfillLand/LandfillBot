<template>
  <div>
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center flex-wrap ga-2">
        <v-btn-group variant="outlined" density="comfortable" color="primary">
          <v-btn
            @click="updateIsListView(false)"
            :color="!isListView ? 'primary' : undefined"
            :variant="!isListView ? 'flat' : 'outlined'"
          >
            <v-icon>mdi-view-grid</v-icon>
          </v-btn>
          <v-btn
            @click="updateIsListView(true)"
            :color="isListView ? 'primary' : undefined"
            :variant="isListView ? 'flat' : 'outlined'"
          >
            <v-icon>mdi-view-list</v-icon>
          </v-btn>
        </v-btn-group>

        <v-btn class="ml-2" variant="tonal" @click="emit('toggle-show-reserved')">
          <v-icon>{{ showReserved ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
          {{ showReserved ? tm('buttons.hideSystemPlugins') : tm('buttons.showSystemPlugins') }}
        </v-btn>

        <v-btn
          class="ml-2"
          color="warning"
          variant="tonal"
          :disabled="updatableExtensions.length === 0"
          :loading="updatingAll"
          @click="emit('update-all')"
        >
          <v-icon>mdi-update</v-icon>
          {{ tm('buttons.updateAll') }}
        </v-btn>

        <v-btn class="ml-2" color="primary" variant="tonal" @click="emit('open-install-dialog')">
          <v-icon>mdi-plus</v-icon>
          {{ tm('buttons.install') }}
        </v-btn>

        <v-col cols="12" sm="auto" class="ml-auto">
          <v-dialog max-width="500px" v-if="extensionMessage">
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon size="small" color="error" class="ml-2" variant="tonal">
                <v-icon>mdi-alert-circle</v-icon>
              </v-btn>
            </template>
            <template v-slot:default="{ isActive }">
              <v-card class="rounded-lg">
                <v-card-title class="headline d-flex align-center">
                  <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
                  {{ tm('dialogs.error.title') }}
                </v-card-title>
                <v-card-text>
                  <p class="text-body-1">{{ extensionMessage }}</p>
                  <p class="text-caption mt-2">{{ tm('dialogs.error.checkConsole') }}</p>
                </v-card-text>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn color="primary" @click="isActive.value = false">{{ tm('buttons.close') }}</v-btn>
                </v-card-actions>
              </v-card>
            </template>
          </v-dialog>
        </v-col>
      </v-col>
    </v-row>

    <v-fade-transition hide-on-leave>
      <div v-if="isListView" key="list-view">
        <v-card class="rounded-lg overflow-hidden elevation-1">
          <v-data-table :headers="pluginHeaders" :items="filteredPlugins" :loading="loading" item-key="name" hover>
            <template v-slot:loader>
              <v-row class="py-8 d-flex align-center justify-center">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
                <span class="ml-2">{{ tm('status.loading') }}</span>
              </v-row>
            </template>

            <template v-slot:item.name="{ item }">
              <div class="d-flex align-center py-2">
                <div class="mr-3" style="flex-shrink: 0;">
                  <img
                    :src="resolveRow(item).logo || defaultPluginIcon"
                    :alt="resolveRow(item).name"
                    style="height: 40px; width: 40px; border-radius: 8px; object-fit: cover;"
                  />
                </div>
                <div>
                  <div class="text-subtitle-1 font-weight-medium">
                    {{ getExtensionDisplayTitle(item) }}
                  </div>
                  <div v-if="hasExtensionDisplayName(item)" class="text-caption text-medium-emphasis mt-1">
                    {{ resolveRow(item).name }}
                  </div>
                  <div v-if="resolveRow(item).reserved" class="d-flex align-center mt-1">
                    <v-chip color="primary" size="x-small" class="font-weight-medium">{{ tm('status.system') }}</v-chip>
                  </div>
                </div>
              </div>
            </template>

            <template v-slot:item.desc="{ item }">
              <div class="text-body-2 text-medium-emphasis">{{ resolveRow(item).desc }}</div>
            </template>

            <template v-slot:item.version="{ item }">
              <div class="d-flex align-center">
                <span class="text-body-2">{{ resolveRow(item).version }}</span>
                <v-icon v-if="resolveRow(item).has_update" color="warning" size="small" class="ml-1">mdi-alert</v-icon>
                <v-tooltip v-if="resolveRow(item).has_update" activator="parent">
                  <span>{{ tm('messages.hasUpdate') }} {{ resolveRow(item).online_version }}</span>
                </v-tooltip>
              </div>
            </template>

            <template v-slot:item.author="{ item }">
              <div class="text-body-2">{{ resolveRow(item).author }}</div>
            </template>

            <template v-slot:item.activated="{ item }">
              <v-chip :color="resolveRow(item).activated ? 'success' : 'error'" size="small" class="font-weight-medium" :variant="resolveRow(item).activated ? 'flat' : 'outlined'">
                {{ resolveRow(item).activated ? tm('status.enabled') : tm('status.disabled') }}
              </v-chip>
            </template>

            <template v-slot:item.actions="{ item }">
              <div class="d-flex align-center">
                <v-btn-group density="comfortable" variant="text" color="primary">
                  <v-btn v-if="!resolveRow(item).activated" icon size="small" color="success" @click="emit('plugin-on', resolveRow(item))">
                    <v-icon>mdi-play</v-icon>
                    <v-tooltip activator="parent" location="top">{{ tm('tooltips.enable') }}</v-tooltip>
                  </v-btn>
                  <v-btn v-else icon size="small" color="error" @click="emit('plugin-off', resolveRow(item))">
                    <v-icon>mdi-pause</v-icon>
                    <v-tooltip activator="parent" location="top">{{ tm('tooltips.disable') }}</v-tooltip>
                  </v-btn>

                  <v-btn icon size="small" color="info" @click="emit('reload', resolveRow(item).name)">
                    <v-icon>mdi-refresh</v-icon>
                    <v-tooltip activator="parent" location="top">{{ tm('tooltips.reload') }}</v-tooltip>
                  </v-btn>

                  <v-btn icon size="small" @click="emit('open-config', resolveRow(item).name)">
                    <v-icon>mdi-cog</v-icon>
                    <v-tooltip activator="parent" location="top">{{ tm('tooltips.configure') }}</v-tooltip>
                  </v-btn>

                  <v-btn icon size="small" @click="emit('show-info', resolveRow(item))">
                    <v-icon>mdi-information</v-icon>
                    <v-tooltip activator="parent" location="top">{{ tm('tooltips.viewInfo') }}</v-tooltip>
                  </v-btn>

                  <v-btn v-if="resolveRow(item).repo" icon size="small" @click="emit('view-readme', resolveRow(item))">
                    <v-icon>mdi-book-open-page-variant</v-icon>
                    <v-tooltip activator="parent" location="top">{{ tm('tooltips.viewDocs') }}</v-tooltip>
                  </v-btn>

                  <v-btn icon size="small" @click="emit('view-changelog', resolveRow(item))">
                    <v-icon>mdi-history</v-icon>
                    <v-tooltip activator="parent" location="top">{{ tm('pluginChangelog.menuTitle') }}</v-tooltip>
                  </v-btn>

                  <v-btn icon size="small" color="warning" @click="emit('update-extension', resolveRow(item).name)">
                    <v-icon>mdi-update</v-icon>
                    <v-tooltip activator="parent" location="top">{{ tm('tooltips.update') }}</v-tooltip>
                  </v-btn>

                  <v-btn icon size="small" color="error" @click="emit('uninstall', { extension: resolveRow(item) })" :disabled="resolveRow(item).reserved">
                    <v-icon>mdi-delete</v-icon>
                    <v-tooltip activator="parent" location="top">{{ tm('tooltips.uninstall') }}</v-tooltip>
                  </v-btn>
                </v-btn-group>
              </div>
            </template>

            <template v-slot:no-data>
              <div class="text-center pa-8">
                <v-icon size="64" color="info" class="mb-4">mdi-puzzle-outline</v-icon>
                <div class="text-h5 mb-2">{{ tm('empty.noPlugins') }}</div>
                <div class="text-body-1 mb-4">{{ tm('empty.noPluginsDesc') }}</div>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </div>

      <div v-else key="grid-view">
        <v-row v-if="filteredPlugins.length === 0" class="text-center">
          <v-col cols="12" class="pa-2">
            <v-icon size="64" color="info" class="mb-4">mdi-puzzle-outline</v-icon>
            <div class="text-h5 mb-2">{{ tm('empty.noPlugins') }}</div>
            <div class="text-body-1 mb-4">{{ tm('empty.noPluginsDesc') }}</div>
          </v-col>
        </v-row>

        <v-row v-else class="installed-extension-grid pb-16">
          <v-col cols="12" md="6" lg="4" v-for="extension in filteredPlugins" :key="extension.name" class="pb-2">
            <ItemCard
              :item="toItemCardExtension(extension)"
              title-field="_title"
              title-class="text-h3"
              enabled-field="activated"
              :show-switch="true"
              :show-edit-button="false"
              :show-delete-button="false"
              :wrap-actions="false"
              class="rounded-lg installed-extension-card"
              @toggle-enabled="() => (extension.activated ? emit('plugin-off', extension) : emit('plugin-on', extension))"
            >
              <template #item-details>
                <div class="d-flex ga-3" style="min-height: 72px;">
                  <div style="flex-shrink: 0;">
                    <img
                      :src="extension.logo || defaultPluginIcon"
                      :alt="extension.name"
                      class="extension-logo"
                    />
                  </div>

                  <div class="flex-grow-1" style="min-width: 0;">
                    <div class="text-caption text-medium-emphasis text-truncate">
                      {{
                        extension.display_name && extension.display_name.length
                          ? `${extension.author} / ${extension.name} · ${extension.version}`
                          : `${extension.author} · ${extension.version}`
                      }}
                    </div>

                    <div v-if="extension.reserved" class="mt-2">
                      <v-chip color="primary" size="x-small" class="font-weight-medium">{{ tm('status.system') }}</v-chip>
                    </div>

                    <div v-if="extension.desc" class="text-body-2 text-medium-emphasis mt-2" style="display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                      {{ extension.desc }}
                    </div>
                  </div>
                </div>
              </template>

              <template #actions>
                <v-menu location="top end">
                  <template #activator="{ props: menuProps }">
                    <v-btn v-bind="menuProps" icon size="small" variant="text" @click.stop>
                      <v-icon>mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>

                  <v-list density="compact" min-width="180">
                    <v-list-item @click="emit('show-info', extension)">
                      <template #prepend>
                        <v-icon size="small">mdi-information</v-icon>
                      </template>
                      <v-list-item-title>{{ tm('tooltips.viewInfo') }}</v-list-item-title>
                    </v-list-item>

                    <v-list-item v-if="extension.repo" @click="emit('view-readme', extension)">
                      <template #prepend>
                        <v-icon size="small">mdi-book-open-page-variant</v-icon>
                      </template>
                      <v-list-item-title>{{ tm('tooltips.viewDocs') }}</v-list-item-title>
                    </v-list-item>

                    <v-list-item @click="emit('view-changelog', extension)">
                      <template #prepend>
                        <v-icon size="small">mdi-history</v-icon>
                      </template>
                      <v-list-item-title>{{ tm('pluginChangelog.menuTitle') }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>

                <v-btn icon size="small" color="primary" variant="text" @click.stop="emit('reload', extension.name)">
                  <v-icon>mdi-refresh</v-icon>
                  <v-tooltip activator="parent" location="top">{{ tm('tooltips.reload') }}</v-tooltip>
                </v-btn>

                <v-btn icon size="small" color="primary" variant="text" @click.stop="emit('open-config', extension.name)">
                  <v-icon>mdi-cog</v-icon>
                  <v-tooltip activator="parent" location="top">{{ tm('tooltips.configure') }}</v-tooltip>
                </v-btn>

                <v-btn
                  icon
                  size="small"
                  color="warning"
                  variant="text"
                  @click.stop="emit('update-extension', extension.name)"
                >
                  <v-icon>mdi-update</v-icon>
                  <v-tooltip activator="parent" location="top">{{ tm('tooltips.update') }}</v-tooltip>
                </v-btn>

                <v-btn
                  icon
                  size="small"
                  color="error"
                  variant="text"
                  :disabled="extension.reserved"
                  @click.stop="requestUninstall(extension)"
                >
                  <v-icon>mdi-delete</v-icon>
                  <v-tooltip activator="parent" location="top">{{ tm('tooltips.uninstall') }}</v-tooltip>
                </v-btn>
              </template>
            </ItemCard>
          </v-col>
        </v-row>
      </div>
    </v-fade-transition>

    <UninstallConfirmDialog
      v-model="showUninstallDialog"
      @confirm="handleUninstallConfirm"
      @cancel="handleUninstallCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue' 
import defaultPluginIcon from '@/assets/images/plugin_icon.png'
import { useModuleI18n } from '@/i18n/composables'
import ItemCard from '@/components/shared/ItemCard.vue' 
import UninstallConfirmDialog from '@/components/shared/UninstallConfirmDialog.vue'

import type { InstalledPlugin, UninstallOptions } from '@/types/extension'

const props = defineProps<{
  isListView: boolean
  filteredPlugins: InstalledPlugin[]
  loading: boolean
  pluginHeaders: Array<{ title: string; key: string; [k: string]: unknown }>
  showReserved: boolean
  updatableExtensions: InstalledPlugin[]
  updatingAll: boolean
  extensionMessage?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:isListView', value: boolean): void
  (e: 'toggle-show-reserved'): void
  (e: 'update-all'): void
  (e: 'open-install-dialog'): void
  (e: 'plugin-on', extension: InstalledPlugin): void
  (e: 'plugin-off', extension: InstalledPlugin): void
  (e: 'reload', name: string): void
  (e: 'open-config', name: string): void
  (e: 'show-info', extension: InstalledPlugin): void
  (e: 'view-readme', extension: InstalledPlugin): void
  (e: 'view-changelog', extension: InstalledPlugin): void
  (e: 'update-extension', name: string): void
  (e: 'uninstall', payload: { extension: InstalledPlugin; options?: UninstallOptions }): void
}>()

const { tm } = useModuleI18n('features/extension')

const updateIsListView = (value: boolean) => {
  emit('update:isListView', value)
}

const resolveRow = (row: unknown): InstalledPlugin => {
  const maybeWrapper = row as { raw?: InstalledPlugin } | null
  if (maybeWrapper && typeof maybeWrapper === 'object' && maybeWrapper.raw) {
    return maybeWrapper.raw
  }
  return row as InstalledPlugin
}

const hasExtensionDisplayName = (row: unknown) => {
  const resolved = resolveRow(row)
  return !!resolved.display_name?.length
}

const getExtensionDisplayTitle = (row: unknown) => {
  const resolved = resolveRow(row)
  return (resolved.display_name?.length ? resolved.display_name : resolved.name) as string
}

const extensionMessage = computed(() => props.extensionMessage ?? '')

const showUninstallDialog = ref(false)
const uninstallingExtension = ref<InstalledPlugin | null>(null)

const toItemCardExtension = (extension: InstalledPlugin) => {
  return {
    ...extension,
    _title: (extension.display_name && extension.display_name.length ? extension.display_name : extension.name) as string,
  }
}

const requestUninstall = (extension: InstalledPlugin) => {
  if (extension.reserved) return
  uninstallingExtension.value = extension
  showUninstallDialog.value = true
}

const handleUninstallConfirm = (options: UninstallOptions) => {
  if (!uninstallingExtension.value) return
  emit('uninstall', { extension: uninstallingExtension.value, options })
  uninstallingExtension.value = null
  showUninstallDialog.value = false 
}

const handleUninstallCancel = () => {
  uninstallingExtension.value = null
  showUninstallDialog.value = false
}
</script>

<style scoped>

:deep(.installed-extension-card .v-card-text) {
  padding-bottom: 0 !important;
}

:deep(.installed-extension-card .v-card-actions) {
  margin-top: 4px !important;
  margin-bottom: 8px !important;
}

.extension-logo {
  height: 100px;
  width: 100px;
  border-radius: 12px;
  object-fit: cover; 
}

@media (max-width: 600px) {
  .installed-extension-grid {
    padding-bottom: 30px;
  }

  .extension-logo {
    height: 50px; 
    width: 50px; 
    border-radius: 8px; 
  }
}
</style>