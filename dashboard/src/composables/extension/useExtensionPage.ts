import { computed, onMounted, ref, watch } from 'vue'

import { useModuleI18n } from '@/i18n/composables'
import { useCommonStore } from '@/stores/common'

import type { ExtensionActiveTab } from '@/types/extension'

import { useCommandConflicts } from './useCommandConflicts'
import { useInstalledPlugins } from './useInstalledPlugins'
import { useLoadingDialog } from './useLoadingDialog'
import { usePluginInstall } from './usePluginInstall'
import { usePluginMarket } from './usePluginMarket'
import { usePluginSources } from './usePluginSources'
import { useSnackToast } from './useSnackToast'
import { normalizeMessage, toReadmeUrl } from './utils'

type InstallResult = { name: string; repo?: string | null }
type AfterInstallOptions = { openReadme?: boolean }

export function useExtensionPage() {
  const commonStore = useCommonStore()
  const { tm } = useModuleI18n('features/extension')

  const activeTab = ref<ExtensionActiveTab>('installed')

  const marketLoading = ref(false)

  const marketFetchedKey = ref<string | null>(null)
  const marketProcessedKey = ref<string | null>(null)

  const { snack_message, snack_show, snack_success, toast } = useSnackToast()
  const { loadingDialog, resetLoadingDialog, onLoadingDialogResult } = useLoadingDialog(tm)

  const { conflictDialog, checkAndPromptConflicts, handleConflictConfirm } = useCommandConflicts({
    onGoToManage: () => {
      activeTab.value = 'components'
    }
  })

  const toChangelogUrl = (repo?: string | null) => {
    const base = (repo ?? '').trim().replace(/\.git$/i, '').replace(/\/+$/g, '')
    if (!base) return null
    if (!/^https?:\/\//i.test(base) && !/^git@/i.test(base)) return null

    // Reuse repo normalization logic via toReadmeUrl, then strip possible #readme.
    const normalized = toReadmeUrl(base)
    if (!normalized) return null
    const repoUrl = normalized.replace(/#readme$/i, '')
    // Best-effort: common GitHub/Gitea both support this style; if not, user still has repo link.
    return `${repoUrl.replace(/\/+$/g, '')}/blob/master/CHANGELOG.md`
  }

  const viewReadme = (plugin: { name: string; repo?: string | null }) => {
    const url = toReadmeUrl(plugin.repo ?? null)
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const viewChangelog = (plugin: { name: string; repo?: string | null }) => {
    const url = toChangelogUrl(plugin.repo ?? null) ?? toReadmeUrl(plugin.repo ?? null)
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const setLoading = (title: string) => {
    loadingDialog.title = title
    loadingDialog.statusCode = 0
    loadingDialog.result = ''
    loadingDialog.show = true
  }

  const installed = useInstalledPlugins({
    tm,
    toast,
    loadingDialog,
    onLoadingDialogResult,
    afterPluginOn: checkAndPromptConflicts
  })

  const sources = usePluginSources({
    tm,
    toast,
    onSelectedChange: () => {
      marketFetchedKey.value = null
      marketProcessedKey.value = null

      if (activeTab.value === 'market') {
        void refreshPluginMarket()
      } else {
        void fetchMarketData(false)
      }
    }
  })

  const market = usePluginMarket({
    tm,
    toast,
    selectedSource: sources.selectedSource,
    getInstalledPlugins: () => (Array.isArray(installed.extension_data?.data) ? installed.extension_data.data : [])
  })

  const checkUpdate = () => {
    installed.checkUpdate(market.pluginMarketData.value)
  }

  const getSourceKey = (sourceUrl: string | null) => sourceUrl ?? '__default__'

  const fetchMarketData = async (force = false) => {
    const key = getSourceKey(sources.selectedSource.value)
    if (!force && marketFetchedKey.value === key) return

    try {
      marketLoading.value = true
      const data = await commonStore.getPluginCollections(force, sources.selectedSource.value)
      market.pluginMarketData.value = data
      marketFetchedKey.value = key

      // Keep installed page update indicators working without doing heavy market indexing.
      checkUpdate()
    } catch (err) {
      toast(tm('messages.getMarketDataFailed') + ' ' + err, 'error')
    } finally {
      marketLoading.value = false
    }
  }

  const processMarketDataIfNeeded = () => {
    const key = getSourceKey(sources.selectedSource.value)
    if (marketProcessedKey.value === key) return

    market.trimExtensionName()
    market.checkAlreadyInstalled()
    marketProcessedKey.value = key
  }

  const refreshPluginMarket = async () => {
    await market.loadPluginMarket(true, true)
    const key = getSourceKey(sources.selectedSource.value)
    marketFetchedKey.value = key
    marketProcessedKey.value = key
    checkUpdate()
  }

  const afterInstall = async (result: InstallResult, options: AfterInstallOptions = {}) => {
    await installed.getExtensions()
    if (marketFetchedKey.value) {
      market.checkAlreadyInstalled()
      checkUpdate()
    }
    if (options.openReadme ?? true) {
      viewReadme({ name: result.name, repo: result.repo ?? null })
    }
    await checkAndPromptConflicts()
  }

  const install = usePluginInstall({
    tm,
    toast,
    loadingFlag: installed.loading_,
    setLoading,
    onLoadingResult: onLoadingDialogResult,
    afterInstall
  })

  const getCartKey = (plugin: { name: string; repo?: string | null }) => {
    const repo = (plugin.repo ?? '').trim()
    return repo || plugin.name
  }

  const cart = ref(new Map<string, any>())

  const cartItems = computed(() => Array.from(cart.value.values()))
  const cartCount = computed(() => cart.value.size)

  const toggleCart = (plugin: any) => {
    if (!plugin) return
    if (plugin.installed) return

    const key = getCartKey(plugin)
    if (cart.value.has(key)) {
      cart.value.delete(key)
    } else {
      cart.value.set(key, plugin)
    }
  }

  const clearCart = () => {
    cart.value.clear()
  }

  const installCart = async () => {
    const items = cartItems.value
    if (items.length === 0) return

    const total = items.length

    const dangerItems = items.filter(p => Array.isArray(p.tags) && p.tags.includes('danger'))

    const run = async () => {
      installed.loading_.value = true
      setLoading(tm('market.cart.batchProgressDetail', { done: 0, total, success: 0, failed: 0 }))

      let success = 0
      let done = 0
      const failed: Array<{ name: string; error: string }> = []

      try {
        for (const plugin of items) {
          const url = (plugin?.repo ?? '').trim()
          if (!url) {
            failed.push({ name: plugin?.name ?? 'unknown', error: 'missing repo url' })
            done++
            loadingDialog.title = tm('market.cart.batchProgressDetail', {
              done,
              total,
              success,
              failed: failed.length
            })
            continue
          }

          try {
            await install.installFromUrl(url, { openReadme: false, silent: true })
            success++
          } catch (err) {
            failed.push({ name: plugin?.name ?? url, error: normalizeMessage(err) })
          } finally {
            done++
            loadingDialog.title = tm('market.cart.batchProgressDetail', {
              done,
              total,
              success,
              failed: failed.length
            })
          }
        }

        await installed.getExtensions()
        if (marketFetchedKey.value) {
          market.checkAlreadyInstalled()
          checkUpdate()
        }

        if (failed.length === 0) {
          onLoadingDialogResult(1, tm('market.cart.batchSuccess', { success, total: items.length }))
        } else {
          onLoadingDialogResult(
            2,
            tm('market.cart.batchPartial', { success, failed: failed.length, total: items.length }),
            -1
          )
        }

        clearCart()
        await checkAndPromptConflicts()
      } finally {
        installed.loading_.value = false
      }
    }

    if (dangerItems.length > 0) {
      install.openDangerConfirm(dangerItems[0], run)
      return
    }

    await run()
  }

  onMounted(() => {
    void installed.getExtensions()

    void (async () => {
      await sources.loadCustomSources()
      await fetchMarketData(false)
    })()

    let urlParams: URLSearchParams
    if (window.location.hash) {
      const hashQuery = window.location.hash.split('?')[1] || ''
      urlParams = new URLSearchParams(hashQuery)
    } else {
      urlParams = new URLSearchParams(window.location.search)
    }
    const plugin_name = urlParams.get('open_config')
    if (plugin_name) {
      void installed.openExtensionConfig(plugin_name)
    }
  })

  watch(activeTab, tab => {
    if (tab !== 'market') return

    void (async () => {
      await fetchMarketData(false)
      processMarketDataIfNeeded()
    })()
  })

  return {
    tm,

    marketLoading,

    conflictDialog,
    checkAndPromptConflicts,
    handleConflictConfirm,

    fileInput: install.fileInput,
    activeTab,

    extension_data: installed.extension_data,
    showReserved: installed.showReserved,
    snack_message,
    snack_show,
    snack_success,
    configDialog: installed.configDialog,
    extension_config: installed.extension_config,
    pluginMarketData: market.pluginMarketData,
    loadingDialog,
    showPluginInfoDialog: installed.showPluginInfoDialog,
    selectedPlugin: installed.selectedPlugin,
    curr_namespace: installed.curr_namespace,
    updatingAll: installed.updatingAll,

    isListView: installed.isListView,
    pluginSearch: installed.pluginSearch,
    loading_: installed.loading_,

    currentPage: market.currentPage,
    displayItemsPerPage: market.displayItemsPerPage,

    dangerConfirmDialog: install.dangerConfirmDialog,
    selectedDangerPlugin: install.selectedDangerPlugin,

    showUninstallDialog: installed.showUninstallDialog,
    pluginToUninstall: installed.pluginToUninstall,

    forceUpdateDialog: installed.forceUpdateDialog,

    showSourceDialog: sources.showSourceDialog,
    sourceName: sources.sourceName,
    sourceUrl: sources.sourceUrl,
    customSources: sources.customSources,
    selectedSource: sources.selectedSource,
    showRemoveSourceDialog: sources.showRemoveSourceDialog,
    sourceToRemove: sources.sourceToRemove,
    editingSource: sources.editingSource,
    originalSourceUrl: sources.originalSourceUrl,

    extension_url: install.extension_url,
    dialog: install.dialog,
    upload_file: install.upload_file,
    uploadTab: install.uploadTab,
    showPluginFullName: market.showPluginFullName,
    marketSearch: market.marketSearch,
    debouncedMarketSearch: market.debouncedMarketSearch,
    refreshingMarket: market.refreshingMarket,
    sortBy: market.sortBy,
    sortOrder: market.sortOrder,

    sortOptions: market.sortOptions,

    plugin_handler_info_headers: installed.plugin_handler_info_headers,
    pluginHeaders: installed.pluginHeaders,

    filteredExtensions: installed.filteredExtensions,
    filteredPlugins: installed.filteredPlugins,
    filteredMarketPlugins: market.filteredMarketPlugins,
    sortedPlugins: market.sortedPlugins,
    totalPages: market.totalPages,
    paginatedPlugins: market.paginatedPlugins,
    updatableExtensions: installed.updatableExtensions,

    toggleShowReserved: installed.toggleShowReserved,

    normalizeMessage,
    toast,

    resetLoadingDialog,
    onLoadingDialogResult,

    getExtensions: installed.getExtensions,
    checkUpdate,

    uninstallExtension: installed.uninstallExtension,
    handleUninstall: installed.handleUninstall,
    handleUninstallConfirm: installed.handleUninstallConfirm,

    updateExtension: installed.updateExtension,
    updateAllExtensions: installed.updateAllExtensions,

    confirmForceUpdate: installed.confirmForceUpdate,
    cancelForceUpdate: installed.cancelForceUpdate,

    pluginOn: installed.pluginOn,
    pluginOff: installed.pluginOff,

    openExtensionConfig: installed.openExtensionConfig,
    updateConfig: installed.updateConfig,

    showPluginInfo: installed.showPluginInfo,
    reloadPlugin: installed.reloadPlugin,

    toReadmeUrl,
    viewReadme,
    viewChangelog,

    handleInstallPlugin: install.handleInstallPlugin,
    confirmDangerInstall: install.confirmDangerInstall,
    cancelDangerInstall: install.cancelDangerInstall,

    cartItems,
    cartCount,
    toggleCart,
    clearCart,
    installCart,

    loadCustomSources: sources.loadCustomSources,
    saveCustomSources: sources.saveCustomSources,
    addCustomSource: sources.addCustomSource,
    selectPluginSource: sources.selectPluginSource,
    selectedSourceObj: sources.selectedSourceObj,
    editCustomSource: sources.editCustomSource,
    removeCustomSource: sources.removeCustomSource,
    confirmRemoveSource: sources.confirmRemoveSource,
    saveCustomSource: sources.saveCustomSource,

    trimExtensionName: market.trimExtensionName,
    checkAlreadyInstalled: market.checkAlreadyInstalled,
    refreshPluginMarket,

    newExtension: install.newExtension,

    marketCustomFilter: market.marketCustomFilter
  }
}
