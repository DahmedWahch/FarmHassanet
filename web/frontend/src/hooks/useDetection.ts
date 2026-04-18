import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'

import { detectImage } from '../lib/api'
import type { DetectionResult } from '../types'

interface UseDetectionResult {
  detect: (file: File) => Promise<void>
  result: DetectionResult | null
  isLoading: boolean
  error: string | null
  reset: () => void
}

function normalizeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status === 413) {
      return 'Image too large. Please upload a file up to 10MB.'
    }
    if (status === 503) {
      return 'Model service is not ready yet. Please try again shortly.'
    }
    if (!error.response) {
      return 'Network error. Please check if the backend is running.'
    }
    return 'Detection failed. Please try another image.'
  }
  return 'Unexpected error during detection.'
}

export function useDetection(): UseDetectionResult {
  const [result, setResult] = useState<DetectionResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  const detect = useCallback(async (file: File) => {
    controllerRef.current?.abort()
    controllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const response = await detectImage(file, controllerRef.current.signal)
      setResult(response)
    } catch (requestError) {
      if (
        axios.isAxiosError(requestError) &&
        requestError.code === 'ERR_CANCELED'
      ) {
        return
      }
      setError(normalizeError(requestError))
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    detect,
    result,
    isLoading,
    error,
    reset,
  }
}
