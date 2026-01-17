import type { ToastColor, ToastOptions } from '@/stores/toast'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $toast: {
      toast: (message: string, color?: ToastColor, opts?: ToastOptions | number) => void
      success: (msg: string, opts?: ToastOptions | number) => void
      error: (msg: string, opts?: ToastOptions | number) => void
      info: (msg: string, opts?: ToastOptions | number) => void
      warning: (msg: string, opts?: ToastOptions | number) => void
    }
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $toast: {
      toast: (message: string, color?: ToastColor, opts?: ToastOptions | number) => void
      success: (msg: string, opts?: ToastOptions | number) => void
      error: (msg: string, opts?: ToastOptions | number) => void
      info: (msg: string, opts?: ToastOptions | number) => void
      warning: (msg: string, opts?: ToastOptions | number) => void
    }
  }
}

declare global {
  const d3: any
}

export {}
