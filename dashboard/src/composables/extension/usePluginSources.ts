import axios from 'axios'
import { computed, ref } from 'vue'

import type { ApiResponse } from '@/types/api'
import type { PluginSource, ToastColor } from '@/types/extension'

export type ToastFn = (message: unknown, color: ToastColor, timeToClose?: number) => void
export type Tm = (key: string, ...args: any[]) => string

export function usePluginSources({
  tm,
  toast,
  onSelectedChange
}: {
  tm: Tm
  toast: ToastFn
  onSelectedChange?: (sourceUrl: string | null) => void
}) {
  const showSourceDialog = ref(false)
  const sourceName = ref('')
  const sourceUrl = ref('')
  const customSources = ref<PluginSource[]>([])
  const selectedSource = ref<string | null>(null)
  const showRemoveSourceDialog = ref(false)
  const sourceToRemove = ref<PluginSource | null>(null)
  const editingSource = ref(false)
  const originalSourceUrl = ref('')

  const selectedSourceObj = computed<PluginSource | null>(() => {
    if (!selectedSource.value) return null
    return customSources.value.find(s => s.url === selectedSource.value) || null
  })

  const loadCustomSources = async () => {
    try {
      const res = await axios.get<ApiResponse<PluginSource[]>>('/api/plugin/source/get')
      if (res.data.status === 'ok') {
        customSources.value = res.data.data
      } else {
        toast(res.data.message, 'error')
      }
    } catch (e) {
      console.warn('Failed to load custom sources:', e)
      customSources.value = []
    }

    const currentSource = localStorage.getItem('selectedPluginSource')
    if (currentSource) {
      selectedSource.value = currentSource
    }
  }

  const saveCustomSources = async () => {
    try {
      const res = await axios.post<ApiResponse<unknown>>('/api/plugin/source/save', {
        sources: customSources.value
      })
      if (res.data.status !== 'ok') {
        toast(res.data.message, 'error')
      }
    } catch (e) {
      toast(e, 'error')
    }
  }

  const addCustomSource = () => {
    editingSource.value = false
    originalSourceUrl.value = ''
    sourceName.value = ''
    sourceUrl.value = ''
    showSourceDialog.value = true
  }

  const editCustomSource = (source: PluginSource | null) => {
    if (!source) return
    editingSource.value = true
    originalSourceUrl.value = source.url
    sourceName.value = source.name
    sourceUrl.value = source.url
    showSourceDialog.value = true
  }

  const removeCustomSource = (source: PluginSource | null) => {
    if (!source) return
    sourceToRemove.value = source
    showRemoveSourceDialog.value = true
  }

  const selectPluginSource = (sourceUrlValue: string | null) => {
    selectedSource.value = sourceUrlValue
    if (sourceUrlValue) {
      localStorage.setItem('selectedPluginSource', sourceUrlValue)
    } else {
      localStorage.removeItem('selectedPluginSource')
    }
    onSelectedChange?.(sourceUrlValue)
  }

  const confirmRemoveSource = () => {
    if (!sourceToRemove.value) return

    const removedUrl = sourceToRemove.value.url
    customSources.value = customSources.value.filter(s => s.url !== removedUrl)
    void saveCustomSources()

    if (selectedSource.value === removedUrl) {
      selectedSource.value = null
      localStorage.removeItem('selectedPluginSource')
      onSelectedChange?.(null)
    }

    toast(tm('market.sourceRemoved'), 'success')
    showRemoveSourceDialog.value = false
    sourceToRemove.value = null
  }

  const saveCustomSource = () => {
    const normalizedUrl = sourceUrl.value.trim()

    if (!sourceName.value.trim() || !normalizedUrl) {
      toast(tm('messages.fillSourceNameAndUrl'), 'error')
      return
    }

    try {
      new URL(normalizedUrl)
    } catch {
      toast(tm('messages.invalidUrl'), 'error')
      return
    }

    if (editingSource.value) {
      const index = customSources.value.findIndex(s => s.url === originalSourceUrl.value)
      if (index !== -1) {
        customSources.value[index] = {
          name: sourceName.value.trim(),
          url: normalizedUrl
        }

        if (selectedSource.value === originalSourceUrl.value) {
          selectedSource.value = normalizedUrl
          localStorage.setItem('selectedPluginSource', normalizedUrl)
          onSelectedChange?.(normalizedUrl)
        }
      }
    } else {
      if (customSources.value.some(source => source.url === normalizedUrl)) {
        toast(tm('market.sourceExists'), 'error')
        return
      }

      customSources.value.push({
        name: sourceName.value.trim(),
        url: normalizedUrl
      })
    }

    void saveCustomSources()
    toast(editingSource.value ? tm('market.sourceUpdated') : tm('market.sourceAdded'), 'success')

    sourceName.value = ''
    sourceUrl.value = ''
    editingSource.value = false
    originalSourceUrl.value = ''
    showSourceDialog.value = false
  }

  return {
    showSourceDialog,
    sourceName,
    sourceUrl,
    customSources,
    selectedSource,
    showRemoveSourceDialog,
    sourceToRemove,
    editingSource,
    originalSourceUrl,

    selectedSourceObj,

    loadCustomSources,
    saveCustomSources,
    addCustomSource,
    editCustomSource,
    removeCustomSource,
    selectPluginSource,
    confirmRemoveSource,
    saveCustomSource
  }
}
