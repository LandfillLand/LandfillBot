import { useToastStore, type ToastColor, type ToastOptions } from '@/stores/toast'

export function useToast() {
  const store = useToastStore()

  const toast = (
    message: string,
    color: ToastColor = 'info',
    opts: ToastOptions | number = {}
  ) => {
    const normalizedOpts: ToastOptions = typeof opts === 'number' ? { timeout: opts } : opts
    store.add({ message, color, ...normalizedOpts })
  }

  return {
    toast,
    success: (msg: string, opts?: ToastOptions) => toast(msg, 'success', opts),
    error: (msg: string, opts?: ToastOptions) => toast(msg, 'error', opts),
    info: (msg: string, opts?: ToastOptions) => toast(msg, 'primary', opts),
    warning: (msg: string, opts?: ToastOptions) => toast(msg, 'warning', opts)
  }
}
