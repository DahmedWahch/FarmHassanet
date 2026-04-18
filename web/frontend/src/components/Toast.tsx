import { type PropsWithChildren, useCallback, useMemo, useState } from 'react'

import { ToastContext, type ToastType } from '../hooks/useToast'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

function toastClass(type: ToastType): string {
  if (type === 'success') {
    return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
  }
  if (type === 'error') {
    return 'border-red-500/40 bg-red-500/15 text-red-200'
  }
  return 'border-blue-500/40 bg-blue-500/15 text-blue-200'
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const item: ToastItem = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      message,
      type,
    }
    setToasts((prev) => [item, ...prev].slice(0, 3))

    const timeout = type === 'error' ? 5000 : 3000
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((entry) => entry.id !== item.id))
    }, timeout)
  }, [])

  const contextValue = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border px-3 py-2 text-sm shadow-lg ${toastClass(item.type)}`}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
