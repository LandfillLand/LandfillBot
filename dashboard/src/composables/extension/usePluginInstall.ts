import axios from 'axios'
import { ref } from 'vue'

import type { ApiResponse } from '@/types/api'
import type { PluginMarketItem, ToastColor } from '@/types/extension'

export type ToastFn = (message: unknown, color: ToastColor, timeToClose?: number) => void
export type Tm = (key: string, ...args: any[]) => string

type InstallResult = { name: string; repo?: string | null }
type AfterInstallOptions = { openReadme?: boolean }
type InstallFromUrlOptions = {
  openReadme?: boolean
  silent?: boolean
}

type InstallFromUrlResponse = { message: unknown; result: InstallResult }

export function usePluginInstall({
  tm,
  toast,
  loadingFlag,
  setLoading,
  onLoadingResult,
  afterInstall
}: {
  tm: Tm
  toast: ToastFn
  loadingFlag: { value: boolean }
  setLoading: (title: string) => void
  onLoadingResult: (statusCode: number, result: unknown, timeToClose?: number) => void
  afterInstall: (result: InstallResult, options?: AfterInstallOptions) => Promise<void>
}) {
  const fileInput = ref<{ click?: () => void } | null>(null)

  const extension_url = ref('')
  const dialog = ref(false)
  const upload_file = ref<File | null>(null)
  const uploadTab = ref<'file' | 'url'>('file')

  const dangerConfirmDialog = ref(false)
  const selectedDangerPlugin = ref<PluginMarketItem | null>(null)
  const pendingDangerAction = ref<(() => void | Promise<void>) | null>(null)

  const openDangerConfirm = (plugin: PluginMarketItem, onConfirm: () => void | Promise<void>) => {
    selectedDangerPlugin.value = plugin
    pendingDangerAction.value = onConfirm
    dangerConfirmDialog.value = true
  }

  const installFromUrl = async (url: string, options: InstallFromUrlOptions = {}): Promise<InstallFromUrlResponse> => {
    const { openReadme = true, silent = false } = options
    const target = (url ?? '').trim()
    if (!target) {
      throw new Error(tm('messages.fillUrlOrFile'))
    }

    if (!silent) {
      toast(tm('messages.installingFromUrl') + ' ' + target, 'primary')
    }

    const res = await axios.post<ApiResponse<InstallResult>>('/api/plugin/install', {
      url: target,
      proxy: localStorage.getItem('selectedGitHubProxy') || ''
    })

    if (!silent) {
      toast(res.data.message, res.data.status === 'ok' ? 'success' : 'error')
    }

    if (res.data.status === 'error') {
      throw new Error(typeof res.data.message === 'string' ? res.data.message : String(res.data.message))
    }

    await afterInstall(res.data.data, { openReadme })
    return { message: res.data.message, result: res.data.data }
  }

  const handleInstallPlugin = async (plugin: PluginMarketItem) => {
    if (plugin.tags && plugin.tags.includes('danger')) {
      openDangerConfirm(plugin, () => {
        extension_url.value = plugin.repo || ''
        dialog.value = true
        uploadTab.value = 'url'
      })
    } else {
      extension_url.value = plugin.repo || ''
      dialog.value = true
      uploadTab.value = 'url'
    }
  }

  const confirmDangerInstall = () => {
    const action = pendingDangerAction.value
    dangerConfirmDialog.value = false
    selectedDangerPlugin.value = null
    pendingDangerAction.value = null

    if (action) {
      void action()
    }
  }

  const cancelDangerInstall = () => {
    dangerConfirmDialog.value = false
    selectedDangerPlugin.value = null
    pendingDangerAction.value = null
  }

  const newExtension = async () => {
    if (extension_url.value === '' && upload_file.value === null) {
      toast(tm('messages.fillUrlOrFile'), 'error')
      return
    }

    if (extension_url.value !== '' && upload_file.value !== null) {
      toast(tm('messages.dontFillBoth'), 'error')
      return
    }

    loadingFlag.value = true
    setLoading(tm('status.loading'))

    if (upload_file.value !== null) {
      toast(tm('messages.installing'), 'primary')
      const formData = new FormData()
      formData.append('file', upload_file.value)
      try {
        const res = await axios.post<ApiResponse<InstallResult>>('/api/plugin/install-upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

        if (res.data.status === 'error') {
          onLoadingResult(2, res.data.message, -1)
          return
        }

        upload_file.value = null
        onLoadingResult(1, res.data.message)
        dialog.value = false

        await afterInstall(res.data.data)
      } catch (err) {
        onLoadingResult(2, err, -1)
      } finally {
        loadingFlag.value = false
      }
    } else {
      try {
        const { message } = await installFromUrl(extension_url.value, { openReadme: true, silent: false })
        extension_url.value = ''
        onLoadingResult(1, message)
        dialog.value = false
      } catch (err) {
        toast(tm('messages.installFailed') + ' ' + err, 'error')
        onLoadingResult(2, err, -1)
      } finally {
        loadingFlag.value = false
      }
    }
  }

  return {
    fileInput,

    extension_url,
    dialog,
    upload_file,
    uploadTab,

    dangerConfirmDialog,
    selectedDangerPlugin,

    openDangerConfirm,
    installFromUrl,

    handleInstallPlugin,
    confirmDangerInstall,
    cancelDangerInstall,

    newExtension
  }
}
