import { reactive } from 'vue'

import { normalizeMessage } from './utils'

export type Tm = (key: string, ...args: any[]) => string

export function useLoadingDialog(tm: Tm) {
  const loadingDialog = reactive({
    show: false,
    title: '',
    statusCode: 0,
    result: ''
  })

  const resetLoadingDialog = () => {
    loadingDialog.show = false
    loadingDialog.title = tm('dialogs.loading.title')
    loadingDialog.statusCode = 0
    loadingDialog.result = ''
  }

  const onLoadingDialogResult = (statusCode: number, result: unknown, timeToClose = 2000) => {
    loadingDialog.statusCode = statusCode
    loadingDialog.result = normalizeMessage(result)
    if (timeToClose === -1) return
    setTimeout(resetLoadingDialog, timeToClose)
  }

  return {
    loadingDialog,
    resetLoadingDialog,
    onLoadingDialogResult
  }
}
