import { pinyin } from 'pinyin-pro'
import { computed, ref, watch } from 'vue'

import { useCommonStore } from '@/stores/common'

import type { InstalledPlugin, PluginMarketItem, ToastColor } from '@/types/extension'

export type ToastFn = (message: unknown, color: ToastColor, timeToClose?: number) => void
export type Tm = (key: string, ...args: any[]) => string

const displayItemsPerPage = 9

export function usePluginMarket({
  tm,
  toast,
  selectedSource,
  getInstalledPlugins
}: {
  tm: Tm
  toast: ToastFn
  selectedSource: { value: string | null }
  getInstalledPlugins: () => InstalledPlugin[]
}) {
  const commonStore = useCommonStore()

  const pluginMarketData = ref<PluginMarketItem[]>([])

  const showPluginFullName = ref(false)
  const marketSearch = ref('')
  const debouncedMarketSearch = ref('')
  const refreshingMarket = ref(false)
  const sortBy = ref('default')
  const sortOrder = ref('desc')

  const currentPage = ref(1)

  const sortOptions = computed(() => [
    { title: tm('sort.default'), value: 'default' },
    { title: tm('sort.stars'), value: 'stars' },
    { title: tm('sort.author'), value: 'author' },
    { title: tm('sort.updated'), value: 'updated' }
  ])

  const normalizeStr = (s: unknown) => (s ?? '').toString().toLowerCase().trim()
  const toPinyinText = (s: unknown) =>
    pinyin(String(s ?? ''), { toneType: 'none' }).toLowerCase().replace(/\s+/g, '')
  const toInitials = (s: unknown) =>
    pinyin(String(s ?? ''), { pattern: 'first', toneType: 'none' }).toLowerCase().replace(/\s+/g, '')

  const marketCustomFilter = (value: unknown, query: string, item: PluginMarketItem) => {
    const q = normalizeStr(query)
    if (!q) return true

    if (item?.searchIndex) {
      return item.searchIndex.includes(q)
    }

    const candidates = new Set<string>()
    if (value != null) candidates.add(String(value))
    if (item?.name) candidates.add(String(item.name))
    if ((item as any)?.display_name) candidates.add(String((item as any).display_name))
    if (item?.trimmedName) candidates.add(String(item.trimmedName))
    if (item?.desc) candidates.add(String(item.desc))
    if (item?.author) candidates.add(String(item.author))

    for (const v of candidates) {
      const nv = normalizeStr(v)
      if (nv.includes(q)) return true
      const pv = toPinyinText(v)
      if (pv.includes(q)) return true
      const iv = toInitials(v)
      if (iv.includes(q)) return true
    }
    return false
  }

  const trimExtensionName = () => {
    pluginMarketData.value.forEach(plugin => {
      if (plugin.name) {
        const name = plugin.name.trim().toLowerCase()
        if (name.startsWith('astrbot_plugin_')) {
          plugin.trimmedName = name.substring(15)
        } else if (name.startsWith('astrbot_') || name.startsWith('astrbot-')) {
          plugin.trimmedName = name.substring(8)
        } else {
          plugin.trimmedName = plugin.name
        }
      }

      const searchTexts: string[] = []
      if ((plugin as any)?.display_name) {
        searchTexts.push((plugin as any).display_name)
        searchTexts.push(toPinyinText((plugin as any).display_name))
        searchTexts.push(toInitials((plugin as any).display_name))
      }
      if (plugin.name) {
        searchTexts.push(plugin.name)
        searchTexts.push(toPinyinText(plugin.name))
        searchTexts.push(toInitials(plugin.name))
      }
      if (plugin.trimmedName) searchTexts.push(plugin.trimmedName)
      if (plugin.desc) {
        searchTexts.push(plugin.desc)
        searchTexts.push(toPinyinText(plugin.desc))
        searchTexts.push(toInitials(plugin.desc))
      }
      if (plugin.author) {
        searchTexts.push(plugin.author)
        searchTexts.push(toPinyinText(plugin.author))
        searchTexts.push(toInitials(plugin.author))
      }

      plugin.searchIndex = searchTexts.map(normalizeStr).join(' ')
    })
  }

  const checkAlreadyInstalled = () => {
    const installed = getInstalledPlugins()
    const installedRepos = new Set(installed.map(ext => ext.repo?.toLowerCase()))
    const installedNames = new Set(installed.map(ext => ext.name))

    for (let i = 0; i < pluginMarketData.value.length; i++) {
      const plugin = pluginMarketData.value[i]
      plugin.installed = installedRepos.has(plugin.repo?.toLowerCase()) || installedNames.has(plugin.name)
    }

    const installedList: PluginMarketItem[] = []
    const notInstalled: PluginMarketItem[] = []
    for (let i = 0; i < pluginMarketData.value.length; i++) {
      if (pluginMarketData.value[i].installed) {
        installedList.push(pluginMarketData.value[i])
      } else {
        notInstalled.push(pluginMarketData.value[i])
      }
    }
    pluginMarketData.value = notInstalled.concat(installedList)
  }

  const loadPluginMarket = async (force = false, toastOnSuccess = true) => {
    refreshingMarket.value = true
    try {
      const data = await commonStore.getPluginCollections(force, selectedSource.value)
      pluginMarketData.value = data
      trimExtensionName()
      checkAlreadyInstalled()
      currentPage.value = 1

      if (toastOnSuccess) {
        toast(tm('messages.refreshSuccess'), 'success')
      }
    } catch (err) {
      toast(tm('messages.refreshFailed') + ' ' + err, 'error')
    } finally {
      refreshingMarket.value = false
    }
  }

  const refreshPluginMarket = async () => loadPluginMarket(true, true)

  const filteredMarketPlugins = computed(() => {
    if (!debouncedMarketSearch.value) {
      return pluginMarketData.value
    }

    const search = debouncedMarketSearch.value.toLowerCase()
    return pluginMarketData.value.filter(plugin => {
      return (
        marketCustomFilter(plugin.name, search, plugin) ||
        marketCustomFilter(plugin.desc, search, plugin) ||
        marketCustomFilter(plugin.author, search, plugin)
      )
    })
  })

  const sortedPlugins = computed(() => {
    const plugins = [...filteredMarketPlugins.value]

    if (sortBy.value === 'stars') {
      plugins.sort((a, b) => {
        const starsA = a.stars ?? 0
        const starsB = b.stars ?? 0
        return sortOrder.value === 'desc' ? starsB - starsA : starsA - starsB
      })
    } else if (sortBy.value === 'author') {
      plugins.sort((a, b) => {
        const authorA = (a.author ?? '').toLowerCase()
        const authorB = (b.author ?? '').toLowerCase()
        const result = authorA.localeCompare(authorB)
        return sortOrder.value === 'desc' ? -result : result
      })
    } else if (sortBy.value === 'updated') {
      plugins.sort((a, b) => {
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0
        return sortOrder.value === 'desc' ? dateB - dateA : dateA - dateB
      })
    } else {
      const pinned = plugins.filter(plugin => plugin?.pinned)
      const notPinned = plugins.filter(plugin => !plugin?.pinned)
      return [...pinned, ...notPinned]
    }

    return plugins
  })

  const totalPages = computed(() => Math.ceil(sortedPlugins.value.length / displayItemsPerPage))

  const paginatedPlugins = computed(() => {
    const start = (currentPage.value - 1) * displayItemsPerPage
    const end = start + displayItemsPerPage
    return sortedPlugins.value.slice(start, end)
  })

  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
  watch(marketSearch, newVal => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }

    searchDebounceTimer = setTimeout(() => {
      debouncedMarketSearch.value = newVal
      currentPage.value = 1
    }, 300)
  })

  return {
    // data
    pluginMarketData,

    // ui state
    showPluginFullName,
    marketSearch,
    debouncedMarketSearch,
    refreshingMarket,
    sortBy,
    sortOrder,
    sortOptions,
    currentPage,

    // derived
    filteredMarketPlugins,
    sortedPlugins,
    totalPages,
    paginatedPlugins,

    // const
    displayItemsPerPage,

    // ops
    refreshPluginMarket,
    loadPluginMarket,
    trimExtensionName,
    checkAlreadyInstalled,

    // helpers
    marketCustomFilter
  }
}
