import { RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { api } from '../lib/api'

type ModelState = 'connecting' | 'online' | 'offline' | 'partial'

interface ModelData {
  faceModel: { loaded: boolean; name: string; size: string }
  genderModel: { loaded: boolean; name: string; size: string }
  nsfwModel: { loaded: boolean; name: string; size: string }
}

const defaultData: ModelData = {
  faceModel: { loaded: false, name: 'Face Model', size: '-' },
  genderModel: { loaded: false, name: 'Gender Model', size: '-' },
  nsfwModel: { loaded: false, name: 'NSFW Model', size: '-' },
}

function rowDotClass(loaded: boolean, errored: boolean): string {
  if (errored) {
    return 'h-2 w-2 rounded-full bg-red-500'
  }
  if (loaded) {
    return 'h-2 w-2 rounded-full bg-emerald-500'
  }
  return 'h-2 w-2 rounded-full bg-yellow-500 animate-pulse'
}

export function ModelStatus() {
  const [state, setState] = useState<ModelState>('connecting')
  const [data, setData] = useState<ModelData>(defaultData)
  const [firstLoading, setFirstLoading] = useState(true)
  const timerRef = useRef<number | null>(null)

  const loadedCount = useMemo(() => {
    return [data.faceModel, data.genderModel, data.nsfwModel].filter(
      (model) => model.loaded,
    ).length
  }, [data])

  const schedule = useCallback((delayMs: number, callback: () => void) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }
    timerRef.current = window.setTimeout(callback, delayMs)
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const response = await api.get<ModelData>('/models/status', {
        timeout: 5000,
      })
      const next = response.data
      setData(next)

      const nextLoaded = [
        next.faceModel.loaded,
        next.genderModel.loaded,
        next.nsfwModel.loaded,
      ]
      const allLoaded = nextLoaded.every(Boolean)
      const someLoaded = nextLoaded.some(Boolean)

      if (allLoaded) {
        setState('online')
      } else if (someLoaded) {
        setState('partial')
        schedule(5000, () => {
          void fetchStatus()
        })
      } else {
        setState('offline')
        schedule(5000, () => {
          void fetchStatus()
        })
      }
    } catch {
      setState('offline')
      schedule(10000, () => {
        void fetchStatus()
      })
    } finally {
      setFirstLoading(false)
    }
  }, [schedule])

  useEffect(() => {
    void fetchStatus()
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [fetchStatus])

  if (firstLoading) {
    return (
      <div aria-live="polite" className="space-y-2">
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full animate-pulse bg-[#1e2d4a]" />
            <div className="h-3 w-28 rounded animate-pulse bg-[#1e2d4a]" />
          </div>
        ))}
      </div>
    )
  }

  const errored = state === 'offline'

  return (
    <div aria-live="polite" className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span
            className={rowDotClass(data.faceModel.loaded, errored)}
            aria-hidden
          />
          <span className="text-[#94a3b8]">{data.faceModel.name}</span>
        </div>
        <span className="text-[#64748b]">{data.faceModel.size}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span
            className={rowDotClass(data.genderModel.loaded, errored)}
            aria-hidden
          />
          <span className="text-[#94a3b8]">{data.genderModel.name}</span>
        </div>
        <span className="text-[#64748b]">{data.genderModel.size}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span
            className={rowDotClass(data.nsfwModel.loaded, errored)}
            aria-hidden
          />
          <span className="text-[#94a3b8]">{data.nsfwModel.name}</span>
        </div>
        <span className="text-[#64748b]">{data.nsfwModel.size}</span>
      </div>

      {state === 'online' && (
        <p className="pt-1 text-xs text-emerald-400">● All Models Ready</p>
      )}
      {state === 'partial' && (
        <p className="pt-1 text-xs text-yellow-400">⚠ Models Loading...</p>
      )}
      {state === 'offline' && loadedCount === 0 && (
        <p className="pt-1 text-xs text-red-400">✗ Models Offline</p>
      )}
      {state === 'offline' && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-red-400">✗ Backend Offline</p>
          <button
            type="button"
            onClick={() => {
              setFirstLoading(false)
              void fetchStatus()
            }}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-[#94a3b8] transition hover:bg-[#1e2d4a] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
