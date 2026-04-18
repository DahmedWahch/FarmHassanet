import { useEffect, useState } from 'react'

import { BlurPreview } from '../components/BlurPreview'
import { DetectionCanvas } from '../components/DetectionCanvas'
import { ImageUpload } from '../components/ImageUpload'
import { SettingsPanel } from '../components/SettingsPanel'
import { StatsPanel } from '../components/StatsPanel'
import { useDetection } from '../hooks/useDetection'
import { useSettings } from '../hooks/useSettings'

type TabKey = 'detection' | 'blur'

export function Dashboard() {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [tab, setTab] = useState<TabKey>('detection')
  const { detect, result, isLoading, error } = useDetection()
  const {
    settings,
    updateSetting,
    saveSettings,
    isSaving,
    isDirty,
    lastSaved,
    saveError,
  } = useSettings()

  useEffect(() => {
    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc)
      }
    }
  }, [imageSrc])

  async function onImageSelected(file: File) {
    setImageSrc((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev)
      }
      return URL.createObjectURL(file)
    })
    await detect(file)
  }

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <ImageUpload onImageSelected={onImageSelected} isLoading={isLoading} />

        {imageSrc ? (
          <div className="space-y-3">
            <div className="inline-flex rounded-lg border border-[#1e2d4a] bg-[#111827] p-1 text-xs">
              <button
                type="button"
                onClick={() => setTab('detection')}
                className={`rounded-md px-3 py-1 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  tab === 'detection'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-[#94a3b8]'
                }`}
              >
                Detection
              </button>
              <button
                type="button"
                onClick={() => setTab('blur')}
                className={`rounded-md px-3 py-1 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                  tab === 'blur'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-[#94a3b8]'
                }`}
              >
                Blur Preview
              </button>
            </div>

            {tab === 'detection' && (
              <DetectionCanvas imageSrc={imageSrc} result={result} settings={settings} />
            )}
            {tab === 'blur' && (
              <BlurPreview imageSrc={imageSrc} result={result} settings={settings} />
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-[#1e2d4a] bg-[#111827] p-8 text-center text-sm text-[#94a3b8]">
            Upload an image to start
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <StatsPanel result={result} settings={settings} isLoading={isLoading} />
      </div>

      <div className="lg:col-span-2">
        <SettingsPanel
          settings={settings}
          updateSetting={updateSetting}
          saveSettings={saveSettings}
          isSaving={isSaving}
          isDirty={isDirty}
          lastSaved={lastSaved}
          saveError={saveError}
        />
      </div>
    </section>
  )
}
