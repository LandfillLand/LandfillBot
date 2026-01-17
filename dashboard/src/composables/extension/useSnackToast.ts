import { ref } from 'vue'

import type { ToastColor } from '@/types/extension'

import { normalizeMessage } from './utils'

export function useSnackToast() {
  const snack_message = ref('')
  const snack_show = ref(false)
  const snack_success = ref<ToastColor>('success')

  const toast = (message: unknown, success: ToastColor, timeToClose?: number) => {
    const normalized = normalizeMessage(message)

    snack_message.value = normalized
    snack_show.value = true
    snack_success.value = success

    if (typeof timeToClose === 'number' && timeToClose >= 0) {
      setTimeout(() => {
        snack_show.value = false
      }, timeToClose)
    }
  }

  return {
    snack_message,
    snack_show,
    snack_success,
    toast
  }
}
