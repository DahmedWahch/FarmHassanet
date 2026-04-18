import { useCallback, useEffect, useRef, useState } from 'react'

import { getSettings, updateSettings as updateSettingsApi } from '../lib/api'
import type { AppSettings } from '../types'
import { useToast } from './useToast'

const fallbackSettings: AppSettings = {
  blurMode: 'women_only',
  blurIntensity: 85,
  nsfwThreshold: 0.5,
  detectFaces: true,
  detectNsfw: true,
  genderThreshold: 0.6,
}

interface UseSettingsResult {
  settings: AppSettings
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  saveSettings: () => Promise<void>
  isSaving: boolean
  isDirty: boolean
  lastSaved: Date | null
  saveError: string | null
}

function collectChangedFields(
  source: AppSettings,
  baseline: AppSettings,
): Partial<AppSettings> {
  const diff: Partial<AppSettings> = {}
  if (source.blurMode !== baseline.blurMode) diff.blurMode = source.blurMode
  if (source.blurIntensity !== baseline.blurIntensity) {
    diff.blurIntensity = source.blurIntensity
  }
  if (source.nsfwThreshold !== baseline.nsfwThreshold) {
    diff.nsfwThreshold = source.nsfwThreshold
  }
  if (source.detectFaces !== baseline.detectFaces) diff.detectFaces = source.detectFaces
  if (source.detectNsfw !== baseline.detectNsfw) diff.detectNsfw = source.detectNsfw
  if (source.genderThreshold !== baseline.genderThreshold) {
    diff.genderThreshold = source.genderThreshold
  }
  return diff
}

export function useSettings(): UseSettingsResult {
  const { toast } = useToast()
  const [settings, setSettings] = useState<AppSettings>(fallbackSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const baselineRef = useRef<AppSettings>(fallbackSettings)
  const debounceTimerRef = useRef<number | null>(null)
  const pendingDiffRef = useRef<Partial<AppSettings>>({})
  const mountedRef = useRef(true)

  const performSave = useCallback(async () => {
    const diff = pendingDiffRef.current
    if (Object.keys(diff).length === 0) {
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const saved = await updateSettingsApi(diff)
      if (!mountedRef.current) {
        return
      }
      baselineRef.current = saved
      setSettings(saved)
      pendingDiffRef.current = {}
      setIsDirty(false)
      setLastSaved(new Date())
      toast('Settings saved', 'success')
    } catch {
      if (!mountedRef.current) {
        return
      }
      setSaveError('Save failed - settings kept locally')
      toast('Save failed - settings kept locally', 'error')
    } finally {
      if (mountedRef.current) {
        setIsSaving(false)
      }
    }
  }, [toast])

  const scheduleAutoSave = useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = window.setTimeout(() => {
      void performSave()
    }, 800)
  }, [performSave])

  useEffect(() => {
    mountedRef.current = true

    async function load() {
      try {
        const remote = await getSettings()
        if (!mountedRef.current) {
          return
        }
        baselineRef.current = remote
        setSettings(remote)
        setLastSaved(new Date())
      } catch {
        if (!mountedRef.current) {
          return
        }
        baselineRef.current = fallbackSettings
        setSettings(fallbackSettings)
      }
    }

    void load()

    return () => {
      mountedRef.current = false
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const updateSetting = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value }
        const diff = collectChangedFields(next, baselineRef.current)
        pendingDiffRef.current = diff
        setIsDirty(Object.keys(diff).length > 0)
        setSaveError(null)
        return next
      })
      scheduleAutoSave()
    },
    [scheduleAutoSave],
  )

  const saveSettings = useCallback(async () => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current)
    }
    await performSave()
  }, [performSave])

  return {
    settings,
    updateSetting,
    saveSettings,
    isSaving,
    isDirty,
    lastSaved,
    saveError,
  }
}
