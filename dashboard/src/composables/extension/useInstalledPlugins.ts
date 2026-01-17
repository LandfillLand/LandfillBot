import axios from 'axios'
import { computed, reactive, ref, watch } from 'vue'

import type { ApiResponse } from '@/types/api'
import type {
  InstalledPlugin,
  PluginHandlerInfo,
  PluginMarketItem,
  ToastColor,
  UninstallOptions
} from '@/types/extension'

export type ToastFn = (message: unknown, color: ToastColor, timeToClose?: number) => void
export type Tm = (key: string, ...args: any[]) => string

type SelectedPlugin = InstalledPlugin & { handlers: PluginHandlerInfo[] }

type UpdateAllResult = { name: string; status: 'ok' | 'error'; message?: string }

export function useInstalledPlugins({
  tm,
  toast,
  loadingDialog,
  onLoadingDialogResult,
  afterPluginOn
}: {
  tm: Tm
  toast: ToastFn
  loadingDialog: { show: boolean; title: string; statusCode: number; result: string }
  onLoadingDialogResult: (statusCode: number, result: unknown, timeToClose?: number) => void
  afterPluginOn?: () => Promise<void>
}) {
  const extension_data = reactive<ApiResponse<InstalledPlugin[]>>({
    status: 'ok',
    data: [],
    message: ''
  })

  const loading_ = ref(false)

  const getInitialShowReserved = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('showReservedPlugins')
      return saved === 'true'
    }
    return false
  }

  const showReserved = ref(getInitialShowReserved())

  const pluginSearch = ref('')

  const getInitialListViewMode = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('pluginListViewMode') === 'true'
    }
    return false
  }

  const isListView = ref(getInitialListViewMode())

  watch(isListView, newVal => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('pluginListViewMode', String(newVal))
    }
  })

  const toggleShowReserved = () => {
    showReserved.value = !showReserved.value
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('showReservedPlugins', String(showReserved.value))
    }
  }

  const filteredExtensions = computed(() => {
    const data = Array.isArray(extension_data?.data) ? extension_data.data : []

    const sorted = [...data].sort((a, b) => {
      const aKey = (a.display_name?.length ? a.display_name : a.name || '').toLowerCase()
      const bKey = (b.display_name?.length ? b.display_name : b.name || '').toLowerCase()
      return aKey.localeCompare(bKey)
    })

    if (!showReserved.value) {
      return sorted.filter(ext => !ext.reserved)
    }
    return sorted
  })

  const filteredPlugins = computed(() => {
    if (!pluginSearch.value) {
      return filteredExtensions.value
    }

    const search = pluginSearch.value.toLowerCase()
    const filtered = filteredExtensions.value.filter(plugin => {
      return (
        plugin.name?.toLowerCase().includes(search) ||
        plugin.desc?.toLowerCase().includes(search) ||
        plugin.author?.toLowerCase().includes(search)
      )
    })

    // 搜索模式下也保持稳定排序（避免启停后列表顺序抖动）
    return [...filtered].sort((a, b) => {
      const aKey = (a.display_name?.length ? a.display_name : a.name || '').toLowerCase()
      const bKey = (b.display_name?.length ? b.display_name : b.name || '').toLowerCase()
      return aKey.localeCompare(bKey)
    })
  })

  const updatableExtensions = computed(() => {
    return Array.isArray(extension_data?.data) ? extension_data.data.filter(ext => ext.has_update) : []
  })

  const checkUpdate = (marketPlugins: PluginMarketItem[]) => {
    const onlinePluginsMap = new Map<string, PluginMarketItem>()
    const onlinePluginsNameMap = new Map<string, PluginMarketItem>()

    marketPlugins.forEach(plugin => {
      if (plugin.repo) {
        onlinePluginsMap.set(plugin.repo.toLowerCase(), plugin)
      }
      onlinePluginsNameMap.set(plugin.name, plugin)
    })

    const data = Array.isArray(extension_data?.data) ? extension_data.data : []
    data.forEach(extension => {
      const repoKey = extension.repo?.toLowerCase()
      const onlinePlugin = repoKey ? onlinePluginsMap.get(repoKey) : null
      const onlinePluginByName = onlinePluginsNameMap.get(extension.name)
      const matchedPlugin = onlinePlugin || onlinePluginByName

      if (matchedPlugin) {
        extension.online_version = matchedPlugin.version
        extension.has_update =
          extension.version !== matchedPlugin.version && matchedPlugin.version !== tm('status.unknown')
      } else {
        extension.has_update = false
      }
    })
  }

  const getExtensions = async () => {
    loading_.value = true
    try {
      const res = await axios.get<ApiResponse<InstalledPlugin[]>>('/api/plugin/get')
      if (!Array.isArray(res.data.data)) {
        console.error('Invalid data format:', res.data)
        throw new Error('Invalid data format')
      }
      Object.assign(extension_data, res.data)
    } catch (err) {
      toast(err, 'error')
    } finally {
      loading_.value = false
    }
  }

  const pluginOn = async (extension: InstalledPlugin) => {
    try {
      const res = await axios.post<ApiResponse<unknown>>('/api/plugin/on', { name: extension.name })
      if (res.data.status === 'error') {
        toast(res.data.message, 'error')
        return
      }
      toast(res.data.message, 'success')
      await getExtensions()
      if (afterPluginOn) {
        await afterPluginOn()
      }
    } catch (err) {
      toast(err, 'error')
    }
  }

  const pluginOff = async (extension: InstalledPlugin) => {
    try {
      const res = await axios.post<ApiResponse<unknown>>('/api/plugin/off', { name: extension.name })
      if (res.data.status === 'error') {
        toast(res.data.message, 'error')
        return
      }
      toast(res.data.message, 'success')
      void getExtensions()
    } catch (err) {
      toast(err, 'error')
    }
  }

  const reloadPlugin = async (plugin_name: string) => {
    try {
      const res = await axios.post<ApiResponse<unknown>>('/api/plugin/reload', { name: plugin_name })
      if (res.data.status === 'error') {
        toast(res.data.message, 'error')
        return
      }
      toast(tm('messages.reloadSuccess'), 'success')
      void getExtensions()
    } catch (err) {
      toast(err, 'error')
    }
  }

  // uninstall
  const showUninstallDialog = ref(false)
  const pluginToUninstall = ref<string | null>(null)

  const uninstallExtension = async (
    extension_name: string,
    optionsOrSkipConfirm: boolean | UninstallOptions = false
  ) => {
    let deleteConfig = false
    let deleteData = false
    let skipConfirm = false

    if (typeof optionsOrSkipConfirm === 'boolean') {
      skipConfirm = optionsOrSkipConfirm
    } else if (typeof optionsOrSkipConfirm === 'object' && optionsOrSkipConfirm !== null) {
      deleteConfig = optionsOrSkipConfirm.deleteConfig || false
      deleteData = optionsOrSkipConfirm.deleteData || false
      skipConfirm = true
    }

    if (!skipConfirm) {
      pluginToUninstall.value = extension_name
      showUninstallDialog.value = true
      return
    }

    toast(tm('messages.uninstalling') + ' ' + extension_name, 'primary')
    try {
      const res = await axios.post<ApiResponse<InstalledPlugin[]>>('/api/plugin/uninstall', {
        name: extension_name,
        delete_config: deleteConfig,
        delete_data: deleteData
      })
      if (res.data.status === 'error') {
        toast(res.data.message, 'error')
        return
      }
      Object.assign(extension_data, res.data)
      toast(res.data.message, 'success')
      void getExtensions()
    } catch (err) {
      toast(err, 'error')
    }
  }

  const handleUninstall = (payload: { extension: InstalledPlugin; options?: UninstallOptions }) => {
    const { extension, options } = payload
    if (!extension) return
    void uninstallExtension(extension.name, options ?? false)
  }

  const handleUninstallConfirm = (options: UninstallOptions) => {
    if (!pluginToUninstall.value) return
    void uninstallExtension(pluginToUninstall.value, options)
    pluginToUninstall.value = null
  }

  // update
  const updatingAll = ref(false)

  // force update (reinstall)
  const forceUpdateDialog = reactive({
    show: false,
    pluginName: ''
  })

  const updateExtension = async (extension_name: string, forceUpdate = false) => {
    if (!forceUpdate) {
      const data = Array.isArray(extension_data?.data) ? extension_data.data : []
      const target = data.find(ext => ext.name === extension_name)
      if (target && !target.has_update) {
        forceUpdateDialog.pluginName = extension_name
        forceUpdateDialog.show = true
        return
      }
    }

    loadingDialog.title = tm('status.loading')
    loadingDialog.show = true
    try {
      const res = await axios.post<ApiResponse<InstalledPlugin[]>>('/api/plugin/update', {
        name: extension_name,
        proxy: localStorage.getItem('selectedGitHubProxy') || ''
      })

      if (res.data.status === 'error') {
        onLoadingDialogResult(2, res.data.message, -1)
        return
      }

      Object.assign(extension_data, res.data)
      onLoadingDialogResult(1, res.data.message)
      setTimeout(async () => {
        toast(tm('messages.refreshing'), 'info', 2000)
        try {
          await getExtensions()
          toast(tm('messages.refreshSuccess'), 'success')
        } catch (error: any) {
          const errorMsg = error?.response?.data?.message || error?.message || String(error)
          toast(`${tm('messages.refreshFailed')}: ${errorMsg}`, 'error')
        }
      }, 1000)
    } catch (err) {
      toast(err, 'error')
    }
  }

  const confirmForceUpdate = async () => {
    const name = forceUpdateDialog.pluginName
    forceUpdateDialog.show = false
    forceUpdateDialog.pluginName = ''
    if (!name) return
    await updateExtension(name, true)
  }

  const cancelForceUpdate = () => {
    forceUpdateDialog.show = false
    forceUpdateDialog.pluginName = ''
  }

  const updateAllExtensions = async () => {
    if (updatingAll.value || updatableExtensions.value.length === 0) return
    updatingAll.value = true
    loadingDialog.title = tm('status.loading')
    loadingDialog.statusCode = 0
    loadingDialog.result = ''
    loadingDialog.show = true

    const targets = updatableExtensions.value.map(ext => ext.name)
    try {
      const res = await axios.post<ApiResponse<{ results?: UpdateAllResult[] }>>('/api/plugin/update-all', {
        names: targets,
        proxy: localStorage.getItem('selectedGitHubProxy') || ''
      })

      if (res.data.status === 'error') {
        onLoadingDialogResult(
          2,
          res.data.message ||
            tm('messages.updateAllFailed', {
              failed: targets.length,
              total: targets.length
            }),
          -1
        )
        return
      }

      const results = res.data.data?.results || []
      const failures = results.filter(r => r.status !== 'ok')
      try {
        await getExtensions()
      } catch (err: any) {
        const errorMsg = err?.response?.data?.message || err?.message || String(err)
        failures.push({ name: 'refresh', status: 'error', message: errorMsg })
      }

      if (failures.length === 0) {
        onLoadingDialogResult(1, tm('messages.updateAllSuccess'))
      } else {
        const failureText = tm('messages.updateAllFailed', {
          failed: failures.length,
          total: targets.length
        })
        const detail = failures.map(f => `${f.name}: ${f.message}`).join('\n')
        onLoadingDialogResult(2, `${failureText}\n${detail}`, -1)
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || String(err)
      onLoadingDialogResult(2, errorMsg, -1)
    } finally {
      updatingAll.value = false
    }
  }

  // config
  const configDialog = ref(false)
  const curr_namespace = ref('')
  const extension_config = reactive<{ metadata: Record<string, unknown>; config: Record<string, unknown> }>({
    metadata: {},
    config: {}
  })

  const openExtensionConfig = async (extension_name: string) => {
    curr_namespace.value = extension_name
    configDialog.value = true
    try {
      const res = await axios.get<
        ApiResponse<{ metadata: Record<string, unknown>; config: Record<string, unknown> }>
      >('/api/config/get?plugin_name=' + extension_name)
      extension_config.metadata = res.data.data.metadata ?? {}
      extension_config.config = res.data.data.config ?? {}
    } catch (err) {
      toast(err, 'error')
    }
  }

  const updateConfig = async () => {
    try {
      const res = await axios.post<ApiResponse<unknown>>(
        '/api/config/plugin/update?plugin_name=' + curr_namespace.value,
        extension_config.config
      )
      if (res.data.status === 'ok') {
        toast(res.data.message, 'success')
      } else {
        toast(res.data.message, 'error')
      }
      configDialog.value = false
      extension_config.metadata = {}
      extension_config.config = {}
      void getExtensions()
    } catch (err) {
      toast(err, 'error')
    }
  }

  // plugin info
  const showPluginInfoDialog = ref(false)
  const selectedPlugin = ref<SelectedPlugin>({ name: '', handlers: [] })

  const showPluginInfo = (plugin: InstalledPlugin) => {
    selectedPlugin.value = {
      ...plugin,
      handlers: plugin.handlers ?? []
    }
    showPluginInfoDialog.value = true
  }

  const plugin_handler_info_headers = computed(() => [
    { title: tm('table.headers.eventType'), key: 'event_type_h' },
    { title: tm('table.headers.description'), key: 'desc', maxWidth: '250px' },
    { title: tm('table.headers.specificType'), key: 'type' },
    { title: tm('table.headers.trigger'), key: 'cmd' }
  ])

  const pluginHeaders = computed(() => [
    { title: tm('table.headers.name'), key: 'name', width: '200px' },
    { title: tm('table.headers.description'), key: 'desc', maxWidth: '250px' },
    { title: tm('table.headers.version'), key: 'version', width: '100px' },
    { title: tm('table.headers.author'), key: 'author', width: '100px' },
    { title: tm('table.headers.status'), key: 'activated', width: '100px' },
    { title: tm('table.headers.actions'), key: 'actions', sortable: false, width: '220px' }
  ])

  return {
    extension_data,
    loading_,

    showReserved,
    pluginSearch,
    isListView,

    configDialog,
    curr_namespace,
    extension_config,

    showPluginInfoDialog,
    selectedPlugin,

    showUninstallDialog,
    pluginToUninstall,

    updatingAll,

    forceUpdateDialog,

    filteredExtensions,
    filteredPlugins,
    updatableExtensions,

    plugin_handler_info_headers,
    pluginHeaders,

    toggleShowReserved,

    checkUpdate,
    getExtensions,

    pluginOn,
    pluginOff,
    reloadPlugin,

    uninstallExtension,
    handleUninstall,
    handleUninstallConfirm,

    updateExtension,
    updateAllExtensions,

    confirmForceUpdate,
    cancelForceUpdate,

    openExtensionConfig,
    updateConfig,

    showPluginInfo
  }
}
