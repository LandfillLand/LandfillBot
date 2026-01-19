<script setup lang="ts">
import { defineAsyncComponent } from 'vue';

import type { PluginHandlerInfo } from '@/types/extension';
import { useExtensionPage } from '@/composables/extension/useExtensionPage';

const InstalledExtensionsSection = defineAsyncComponent(() => import('@/components/extension/InstalledExtensionsSection.vue'));
const MarketExtensionsSection = defineAsyncComponent(() => import('@/components/extension/MarketExtensionsSection.vue'));
const McpServersSection = defineAsyncComponent(() => import('@/components/extension/McpServersSection.vue'));
const ComponentPanel = defineAsyncComponent(() => import('@/components/extension/componentPanel/index.vue'));
const AstrBotConfig = defineAsyncComponent(() => import('@/components/shared/AstrBotConfig.vue'));
const ConsoleDisplayer = defineAsyncComponent(() => import('@/components/shared/ConsoleDisplayer.vue'));
const ProxySelector = defineAsyncComponent(() => import('@/components/shared/ProxySelector.vue'));
const UninstallConfirmDialog = defineAsyncComponent(() => import('@/components/shared/UninstallConfirmDialog.vue'));

const {
  tm,
  conflictDialog,
  handleConflictConfirm,
  fileInput,
  activeTab,
  extension_data,
  showReserved,
  snack_message,
  snack_show,
  snack_success,
  configDialog,
  extension_config,
  loadingDialog,
  showPluginInfoDialog,
  selectedPlugin,
  curr_namespace,
  updatingAll,
  isListView,
  pluginSearch,
  loading_,
  currentPage,
  dangerConfirmDialog,
  showUninstallDialog,
  forceUpdateDialog,
  showSourceDialog,
  sourceName,
  sourceUrl,
  customSources,
  selectedSource,
  showRemoveSourceDialog,
  sourceToRemove,
  editingSource,
  extension_url,
  dialog,
  upload_file,
  uploadTab,
  showPluginFullName,
  marketSearch,
  refreshingMarket,
  marketLoading,
  sortBy,
  sortOrder,
  sortOptions,
  plugin_handler_info_headers,
  pluginHeaders,
  filteredPlugins,
  filteredMarketPlugins,
  paginatedPlugins,
  totalPages,
  updatableExtensions,
  toggleShowReserved,
  resetLoadingDialog,
  handleUninstallConfirm,
  updateAllExtensions,
  pluginOn,
  pluginOff,
  reloadPlugin,
  openExtensionConfig,
  updateConfig,
  showPluginInfo,
  viewReadme,
  viewChangelog,
  updateExtension,
  confirmForceUpdate,
  cancelForceUpdate,
  handleUninstall,
  refreshPluginMarket,
  handleInstallPlugin,
  selectPluginSource,
  addCustomSource,
  editCustomSource,
  removeCustomSource,
  selectedSourceObj,
  saveCustomSource,
  confirmRemoveSource,
  cancelDangerInstall,
  confirmDangerInstall,
  newExtension,
  cartItems,
  cartCount,
  toggleCart,
  clearCart,
  installCart
} = useExtensionPage();
</script>

<template>
  <v-row>
    <v-col cols="12" md="12">
      <v-card variant="flat" style="background-color: transparent">
        <!-- 标签页 -->
        <v-card-text style="padding: 0px 12px;">
          <!-- 标签栏和搜索栏 - 响应式布局 -->
          <div class="mb-4 d-flex flex-wrap">
            <!-- 标签栏 -->
            <v-tabs v-model="activeTab" color="primary">
              <v-tab value="installed">
                <v-icon class="mr-2">mdi-puzzle</v-icon>
                {{ tm('tabs.installedPlugins') }}
              </v-tab>
              <v-tab value="mcp">
                <v-icon class="mr-2">mdi-server-network</v-icon>
                {{ tm('tabs.installedMcpServers') }}
              </v-tab>
              <v-tab value="market">
                <v-icon class="mr-2">mdi-store</v-icon>
                {{ tm('tabs.market') }}
              </v-tab>
              <v-tab value="components">
                <v-icon class="mr-2">mdi-wrench</v-icon>
                {{ tm('tabs.handlersOperation') }}
              </v-tab>
            </v-tabs>

            <!-- 搜索栏 - 在移动端时独占一行 -->
            <div style="flex-grow: 1; min-width: 250px; max-width: 400px; margin-left: auto; margin-top: 8px;">
              <v-text-field v-if="activeTab === 'market'" v-model="marketSearch" density="compact"
                :label="tm('search.marketPlaceholder')" prepend-inner-icon="mdi-magnify" variant="solo-filled" flat
                hide-details single-line>
              </v-text-field>
              <v-text-field v-else-if="activeTab === 'installed'" v-model="pluginSearch" density="compact" :label="tm('search.placeholder')"
                prepend-inner-icon="mdi-magnify" variant="solo-filled" flat hide-details single-line>
              </v-text-field>
            </div>

          </div>


          <!-- 已安装插件标签页内容 -->
          <div v-if="activeTab === 'installed'">
            <InstalledExtensionsSection
              v-model:isListView="isListView"
              :filtered-plugins="filteredPlugins"
              :loading="loading_"
              :plugin-headers="pluginHeaders"
              :show-reserved="showReserved"
              :updatable-extensions="updatableExtensions"
              :updating-all="updatingAll"
              :extension-message="extension_data.message"
              @toggle-show-reserved="toggleShowReserved"
              @update-all="updateAllExtensions"
              @open-install-dialog="dialog = true"
              @plugin-on="pluginOn"
              @plugin-off="pluginOff"
              @reload="reloadPlugin"
              @open-config="openExtensionConfig"
              @show-info="showPluginInfo"
              @view-readme="viewReadme"
              @view-changelog="viewChangelog"
              @update-extension="updateExtension"
              @uninstall="handleUninstall"
            />
          </div>

          <!-- 指令面板标签页内容 -->
          <div v-if="activeTab === 'components'">
            <v-card class="rounded-lg" variant="flat" style="background-color: transparent;">
              <v-card-text class="pa-0">
                <ComponentPanel :active="activeTab === 'components'" />
              </v-card-text>
            </v-card>
          </div>

          <!-- 已安装的 MCP 服务器标签页内容 -->
          <div v-if="activeTab === 'mcp'">
            <v-card class="rounded-lg" variant="flat" style="background-color: transparent;">
              <v-card-text class="pa-0">
                <McpServersSection />
              </v-card-text>
            </v-card>
          </div>

          <!-- 插件市场标签页内容 -->
          <div v-if="activeTab === 'market'">
            <MarketExtensionsSection
              :filtered-market-plugins="filteredMarketPlugins"
              :paginated-plugins="paginatedPlugins"
              :current-page="currentPage"
              :total-pages="totalPages"
              :sort-by="sortBy"
              :sort-order="sortOrder"
              :sort-options="sortOptions"
              :refreshing-market="refreshingMarket"
              :market-loading="marketLoading"
              :custom-sources="customSources"
              :selected-source="selectedSource"
              :selected-source-obj="selectedSourceObj"
              :show-plugin-full-name="showPluginFullName"
              :cart-items="cartItems"
              :cart-count="cartCount"
              @update:currentPage="currentPage = $event"
              @update:sortBy="sortBy = $event"
              @update:sortOrder="sortOrder = $event"
              @refresh="refreshPluginMarket"
              @handle-install-plugin="handleInstallPlugin"
              @open-install-dialog="dialog = true"
              @select-plugin-source="selectPluginSource"
              @add-custom-source="addCustomSource"
              @edit-custom-source="editCustomSource"
              @remove-custom-source="removeCustomSource"
              @toggle-cart="toggleCart"
              @clear-cart="clearCart"
              @install-cart="installCart"
              @view-readme="viewReadme"
            />
          </div>

          <v-row v-if="loading_">
            <v-col cols="12" class="d-flex justify-center">
              <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col v-if="activeTab === 'market'" cols="12" md="12">
      <div class="d-flex align-center justify-center mt-4 mb-4 gap-4">
        <v-btn
          variant="text"
          prepend-icon="mdi-book-open-variant"
          href="https://docs.astrbot.app/dev/plugin.html"
          target="_blank"
          color="primary"
          class="text-none"
        >
          {{ tm('market.devDocs') }}
        </v-btn>
        <div style="height: 24px; width: 1px; background-color: rgba(var(--v-theme-on-surface), 0.12);"></div>
        <v-btn
          variant="text"
          prepend-icon="mdi-github"
          href="https://github.com/AstrBotDevs/AstrBot_Plugins_Collection"
          target="_blank"
          color="primary"
          class="text-none"
        >
          {{ tm('market.submitRepo') }}
        </v-btn>
      </div>
    </v-col>
  </v-row>

  <!-- 配置对话框 -->
  <v-dialog v-model="configDialog" width="1000">
    <v-card>
      <v-card-title class="text-h5">{{ tm('dialogs.config.title') }}</v-card-title>
      <v-card-text>
        <AstrBotConfig v-if="extension_config.metadata" :metadata="extension_config.metadata"
          :iterable="extension_config.config" :metadataKey="curr_namespace" />
        <p v-else>{{ tm('dialogs.config.noConfig') }}</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" variant="text" @click="updateConfig">{{ tm('buttons.saveAndClose') }}</v-btn>
        <v-btn color="blue-darken-1" variant="text" @click="configDialog = false">{{ tm('buttons.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>


  <!-- 加载对话框 -->
  <v-dialog v-model="loadingDialog.show" width="700" persistent>
    <v-card>
      <v-card-title class="text-h5">{{ loadingDialog.title }}</v-card-title>
      <v-card-text style="max-height: calc(100vh - 200px); overflow-y: auto;">
        <v-progress-linear v-if="loadingDialog.statusCode === 0" indeterminate color="primary"
          class="mb-4"></v-progress-linear>

        <div v-if="loadingDialog.statusCode !== 0" class="py-8 text-center">
          <v-icon class="mb-6" :color="loadingDialog.statusCode === 1 ? 'success' : 'error'"
            :icon="loadingDialog.statusCode === 1 ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline'"
            size="128"></v-icon>
          <div class="text-h4 font-weight-bold">{{ loadingDialog.result }}</div>
        </div>

        <div style="margin-top: 32px;">
          <h3>{{ tm('dialogs.loading.logs') }}</h3>
          <ConsoleDisplayer historyNum="10" style="height: 200px; margin-top: 16px; margin-bottom: 24px;">
          </ConsoleDisplayer>
        </div>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" variant="text" @click="resetLoadingDialog">{{ tm('buttons.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 强制更新确认对话框 -->
  <v-dialog v-model="forceUpdateDialog.show" max-width="500">
    <v-card class="rounded-lg">
      <v-card-title class="headline">{{ tm('dialogs.forceUpdate.title') }}</v-card-title>
      <v-card-text>
        <p class="text-body-1">{{ tm('dialogs.forceUpdate.message') }}</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="cancelForceUpdate">{{ tm('buttons.cancel') }}</v-btn>
        <v-btn color="warning" variant="tonal" @click="confirmForceUpdate">{{ tm('dialogs.forceUpdate.confirm') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 插件信息对话框 -->
  <v-dialog v-model="showPluginInfoDialog" width="1200">
    <v-card>
      <v-card-title class="text-h5">{{ selectedPlugin?.name }} {{ tm('buttons.viewInfo') }}</v-card-title>
      <v-card-text>
        <v-data-table style="font-size: 17px;" :headers="plugin_handler_info_headers" :items="selectedPlugin?.handlers || []"
          item-key="name">
          <template v-slot:header.id="{ column }">
            <p style="font-weight: bold;">{{ column.title }}</p>
          </template>
          <template v-slot:item.event_type="{ item }: { item: PluginHandlerInfo }">
            {{ item.event_type }}
          </template>
          <template v-slot:item.desc="{ item }: { item: PluginHandlerInfo }">
            {{ item.desc }}
          </template>
          <template v-slot:item.type="{ item }: { item: PluginHandlerInfo }">
            <v-chip color="success">
              {{ item.type }}
            </v-chip>
          </template>
          <template v-slot:item.cmd="{ item }: { item: PluginHandlerInfo }">
            <span style="font-weight: bold;">{{ item.cmd }}</span>
          </template>
        </v-data-table>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" variant="text" @click="showPluginInfoDialog = false">{{ tm('buttons.close')
          }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-snackbar :timeout="2000" elevation="24" :color="snack_success" v-model="snack_show">
    {{ snack_message }}
  </v-snackbar>

  <!-- 卸载插件确认对话框（列表模式用） -->
  <UninstallConfirmDialog v-model="showUninstallDialog" @confirm="handleUninstallConfirm" />

  <!-- 指令冲突提示对话框 -->
  <v-dialog v-model="conflictDialog.show" max-width="420">
    <v-card class="rounded-lg">
      <v-card-title class="d-flex align-center pa-4">
        <v-icon color="warning" class="mr-2">mdi-alert-circle</v-icon>
        {{ tm('conflicts.title') }}
      </v-card-title>
      <v-card-text class="px-4 pb-2">
        <div class="d-flex align-center mb-3">
          <v-chip color="warning" variant="tonal" size="large" class="font-weight-bold">
            {{ conflictDialog.count }}
          </v-chip>
          <span class="ml-2 text-body-1">{{ tm('conflicts.pairs') }}</span>
        </div>
        <p class="text-body-2" style="color: rgba(var(--v-theme-on-surface), 0.7);">
          {{ tm('conflicts.message') }}
        </p>
      </v-card-text>
      <v-card-actions class="pa-4 pt-2">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="conflictDialog.show = false">{{ tm('conflicts.later') }}</v-btn>
        <v-btn color="warning" variant="flat" @click="handleConflictConfirm">
          {{ tm('conflicts.goToManage') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 危险插件确认对话框 -->
  <v-dialog v-model="dangerConfirmDialog" width="500" persistent>
    <v-card>
      <v-card-title class="text-h5 d-flex align-center">
        <v-icon color="warning" class="mr-2">mdi-alert-circle</v-icon>
        {{ tm('dialogs.danger_warning.title') }}
      </v-card-title>
      <v-card-text>
        <div>{{ tm('dialogs.danger_warning.message') }}</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" @click="cancelDangerInstall">
          {{ tm('dialogs.danger_warning.cancel') }}
        </v-btn>
        <v-btn color="warning" @click="confirmDangerInstall">
          {{ tm('dialogs.danger_warning.confirm') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 上传插件对话框 -->
  <v-dialog v-model="dialog" width="500">

    <v-card :loading="loading_" class="rounded-lg" elevation="2">
      <template #loader>
        <v-progress-linear :indeterminate="loading_" color="primary" height="2"></v-progress-linear>
      </template>

      <v-card-title class="text-h5">{{ tm('dialogs.install.title') }}</v-card-title>

      <v-card-text>
        <v-tabs v-model="uploadTab" color="primary">
          <v-tab value="file">{{ tm('dialogs.install.fromFile') }}</v-tab>
          <v-tab value="url">{{ tm('dialogs.install.fromUrl') }}</v-tab>
        </v-tabs>

        <v-window v-model="uploadTab" class="mt-4">
          <v-window-item value="file">
            <div class="d-flex flex-column align-center justify-center pa-4">
              <v-file-input ref="fileInput" v-model="upload_file" :label="tm('upload.selectFile')" accept=".zip"
                hide-details hide-input class="d-none"></v-file-input>

              <v-btn color="primary" size="large" prepend-icon="mdi-upload" @click="fileInput?.click?.()" elevation="2">
                {{ tm('buttons.selectFile') }}
              </v-btn>

              <div class="text-body-2 text-medium-emphasis mt-2">
                {{ tm('messages.supportedFormats') }}
              </div>

              <div v-if="upload_file" class="mt-4 text-center">
                <v-chip color="primary" size="large" closable @click:close="upload_file = null">
                  {{ upload_file.name }}
                  <template v-slot:append>
                    <span class="text-caption ml-2">({{ (upload_file.size / 1024).toFixed(1) }}KB)</span>
                  </template>
                </v-chip>
              </div>
            </div>
          </v-window-item>

          <v-window-item value="url">
            <div class="pa-4">
              <v-text-field v-model="extension_url" :label="tm('upload.enterUrl')" variant="outlined"
                prepend-inner-icon="mdi-link" hide-details class="rounded-lg mb-4"
                placeholder="https://github.com/username/repo"></v-text-field>

              <ProxySelector></ProxySelector>
            </div>
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="dialog = false">{{ tm('buttons.cancel') }}</v-btn>
        <v-btn color="primary" variant="text" @click="newExtension">{{ tm('buttons.install') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 添加/编辑自定义插件源对话框 -->
  <v-dialog v-model="showSourceDialog" width="500">
    <v-card>
      <v-card-title class="text-h5">{{ editingSource ? tm('market.editSource') : tm('market.addSource') }}</v-card-title>
      <v-card-text>
        <div class="pa-2">
          <v-text-field
            v-model="sourceName"
            :label="tm('market.sourceName')"
            variant="outlined"
            prepend-inner-icon="mdi-rename-box"
            hide-details
            class="mb-4"
            placeholder="我的插件源"
          ></v-text-field>
          
          <v-text-field
            v-model="sourceUrl"
            :label="tm('market.sourceUrl')"
            variant="outlined"
            prepend-inner-icon="mdi-link"
            hide-details
            placeholder="https://example.com/plugins.json"
          ></v-text-field>
          
          <div class="text-caption text-medium-emphasis mt-2">
            {{ tm('messages.enterJsonUrl') }}
          </div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="showSourceDialog = false">{{ tm('buttons.cancel') }}</v-btn>
        <v-btn color="primary" variant="text" @click="saveCustomSource">{{ tm('buttons.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- 删除插件源确认对话框 -->
  <v-dialog v-model="showRemoveSourceDialog" width="400">
    <v-card>
      <v-card-title class="text-h5 d-flex align-center">
        <v-icon color="warning" class="mr-2">mdi-alert-circle</v-icon>
        {{ tm('dialogs.uninstall.title') }}
      </v-card-title>
      <v-card-text>
        <div>{{ tm('market.confirmRemoveSource') }}</div>
        <div v-if="sourceToRemove" class="mt-2">
          <strong>{{ sourceToRemove.name }}</strong>
          <div class="text-caption">{{ sourceToRemove.url }}</div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="showRemoveSourceDialog = false">{{ tm('buttons.cancel') }}</v-btn>
        <v-btn color="error" variant="text" @click="confirmRemoveSource">{{ tm('buttons.deleteSource') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.plugin-handler-item {
  margin-bottom: 10px;
  padding: 5px;
  border-radius: 5px;
  background-color: #f5f5f5;
}

.plugin-description {
  color: rgba(var(--v-theme-on-surface), 0.6);
  line-height: 1.3;
  margin-bottom: 6px;
  flex: 1;
  overflow-y: hidden;
}

.plugin-card:hover .plugin-description {
  overflow-y: auto;
}

.plugin-description::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.plugin-description::-webkit-scrollbar-track {
  background: transparent;
}

.plugin-description::-webkit-scrollbar-thumb {
  background-color: rgba(var(--v-theme-primary-rgb), 0.4);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.plugin-description::-webkit-scrollbar-thumb:hover {
  background-color: rgba(var(--v-theme-primary-rgb), 0.6);
}
</style>
