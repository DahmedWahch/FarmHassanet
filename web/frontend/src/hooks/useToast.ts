import { createContext, useContext } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastApi {
  toast: (message: string, type?: ToastType) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) {
    return {
      toast: () => {
        // noop fallback so app does not crash if provider is missing
      },
    }
  }
  return context
}
