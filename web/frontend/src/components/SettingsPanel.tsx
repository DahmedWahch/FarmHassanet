import { Eye, ShieldAlert, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type { AppSettings } from '../types'

interface SettingsPanelProps {
  settings: AppSettings
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  saveSettings: () => Promise<void>
  isSaving: boolean
  isDirty: boolean
  lastSaved: Date | null
  saveError: string | null
}

function relativeTime(date: Date | null): string {
  if (!date) {
    return 'never'
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 10) {
    return 'just now'
  }
  if (seconds < 60) {
    return `${seconds}s ago`
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} min ago`
  }
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

export function SettingsPanel({
  settings,
  updateSetting,
  saveSettings,
  isSaving,
  isDirty,
  lastSaved,
  saveError,
}: SettingsPanelProps) {
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (!lastSaved) {
      return
    }
    setSavedFlash(true)
    const timeout = window.setTimeout(() => setSavedFlash(false), 2000)
    return () => {
      window.clearTimeout(timeout)
    }
  }, [lastSaved])

  const saveLabel = useMemo(() => {
    if (isSaving) {
      return 'Saving...'
    }
    if (saveError) {
      return 'Failed'
    }
    if (savedFlash) {
      return 'Saved ✓'
    }
    return 'Save Settings'
  }, [isSaving, saveError, savedFlash])

  return (
    <aside className="space-y-4 rounded-xl border border-[#1e2d4a] bg-[#111827] p-4">
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#e2e8f0]">
          <Users className="h-4 w-4" />
          Face and Gender Detection
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['women_only', 'Women Only'],
              ['all_faces', 'All Faces'],
              ['men_only', 'Men Only'],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => updateSetting('blurMode', mode)}
              className={`rounded-lg px-2 py-2 text-xs transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                settings.blurMode === mode
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'border border-[#1e2d4a] text-[#94a3b8] hover:bg-[#1e2d4a]/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="block space-y-1 text-xs text-[#94a3b8]">
          <span>Gender Confidence: {settings.genderThreshold.toFixed(2)}</span>
          <input
            type="range"
            min={0.5}
            max={0.95}
            step={0.05}
            value={settings.genderThreshold}
            onChange={(event) =>
              updateSetting('genderThreshold', Number(event.target.value))
            }
            aria-label="Gender confidence threshold"
            aria-valuenow={settings.genderThreshold}
            className="w-full accent-emerald-500"
          />
        </label>
      </section>

      <section className="space-y-3 border-t border-[#1e2d4a] pt-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#e2e8f0]">
          <ShieldAlert className="h-4 w-4" />
          Content Detection
        </h3>
        <label className="block space-y-1 text-xs text-[#94a3b8]">
          <span>NSFW Sensitivity: {settings.nsfwThreshold.toFixed(2)}</span>
          <input
            type="range"
            min={0.1}
            max={0.95}
            step={0.05}
            value={settings.nsfwThreshold}
            onChange={(event) =>
              updateSetting('nsfwThreshold', Number(event.target.value))
            }
            aria-label="NSFW sensitivity"
            aria-valuenow={settings.nsfwThreshold}
            className="w-full accent-emerald-500"
          />
        </label>
      </section>

      <section className="space-y-3 border-t border-[#1e2d4a] pt-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[#e2e8f0]">
          <Eye className="h-4 w-4" />
          Appearance
        </h3>
        <label className="block space-y-1 text-xs text-[#94a3b8]">
          <span>Blur Intensity: {settings.blurIntensity}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={settings.blurIntensity}
            onChange={(event) =>
              updateSetting('blurIntensity', Number(event.target.value))
            }
            aria-label="Blur intensity"
            aria-valuenow={settings.blurIntensity}
            className="w-full accent-emerald-500"
          />
        </label>
      </section>

      <div className="border-t border-[#1e2d4a] pt-4">
        <button
          type="button"
          onClick={() => void saveSettings()}
          disabled={!isDirty || isSaving}
          className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
            !isDirty || isSaving
              ? 'cursor-not-allowed bg-[#1e2d4a] text-[#64748b]'
              : saveError
                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                : 'bg-emerald-500 text-[#0a0f1a] hover:bg-emerald-400'
          }`}
        >
          {saveLabel}
        </button>

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-[#64748b]">Last saved: {relativeTime(lastSaved)}</span>
          {saveError && (
            <button
              type="button"
              onClick={() => void saveSettings()}
              className="text-red-400 underline decoration-red-400/50 underline-offset-2"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
