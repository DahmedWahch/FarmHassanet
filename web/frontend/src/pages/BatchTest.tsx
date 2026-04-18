import { DownloadCloud, Grid3X3, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { BlurPreview } from '../components/BlurPreview'
import { DetectionCanvas } from '../components/DetectionCanvas'
import { detectImage } from '../lib/api'
import { useSettings } from '../hooks/useSettings'
import { useToast } from '../hooks/useToast'
import type { DetectionResult } from '../types'

interface BatchResultItem {
  file: File
  src: string
  result: DetectionResult | null
  error?: string
}

interface ProcessStats {
  processed: number
  total: number
  avgLatency: number
}

const MAX_FILES = 50
const MAX_FILE_SIZE = 10 * 1024 * 1024

function countFaces(result: DetectionResult) {
  return {
    female: result.faces.filter((face) => face.gender === 'female').length,
    male: result.faces.filter((face) => face.gender === 'male').length,
    unknown: result.faces.filter((face) => face.gender === 'unknown').length,
  }
}

function formatRemainingMs(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `~${Math.max(0, Math.round(milliseconds))}ms remaining`
  }
  return `~${(milliseconds / 1000).toFixed(1)}s remaining`
}

function trapFocus(container: HTMLElement): () => void {
  const selector =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(selector),
  ).filter((element) => !element.hasAttribute('disabled'))

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Tab' || elements.length === 0) {
      return
    }

    const first = elements[0]
    const last = elements[elements.length - 1]
    const active = document.activeElement as HTMLElement | null
    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  container.addEventListener('keydown', onKeyDown)
  return () => {
    container.removeEventListener('keydown', onKeyDown)
  }
}

export function BatchTest() {
  const { toast } = useToast()
  const { settings } = useSettings()
  const [files, setFiles] = useState<File[]>([])
  const [srcMap, setSrcMap] = useState<Map<string, string>>(new Map())
  const [results, setResults] = useState<BatchResultItem[]>([])
  const [running, setRunning] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [stats, setStats] = useState<ProcessStats>({ processed: 0, total: 0, avgLatency: 0 })
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const cancelRef = useRef(false)
  const modalRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    return () => {
      srcMap.forEach((value) => URL.revokeObjectURL(value))
    }
  }, [srcMap])

  useEffect(() => {
    if (selectedIndex === null || !modalRef.current) {
      return
    }
    const release = trapFocus(modalRef.current)
    return release
  }, [selectedIndex])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (selectedIndex === null) {
        return
      }
      if (event.key === 'Escape') {
        setSelectedIndex(null)
      } else if (event.key === 'ArrowRight') {
        setSelectedIndex((prev) =>
          prev === null ? prev : Math.min(results.length - 1, prev + 1),
        )
      } else if (event.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev === null ? prev : Math.max(0, prev - 1)))
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [selectedIndex, results.length])

  function addFiles(incoming: File[]) {
    const accepted: File[] = []
    for (const file of incoming) {
      if (!file.type.startsWith('image/')) {
        toast(`Skipped non-image: ${file.name}`, 'error')
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        toast(`Skipped >10MB: ${file.name}`, 'error')
        continue
      }
      accepted.push(file)
    }

    const merged = [...files, ...accepted]
    if (merged.length > MAX_FILES) {
      toast(`Only first ${MAX_FILES} images are kept`, 'info')
    }
    const next = merged.slice(0, MAX_FILES)
    setFiles(next)

    setSrcMap((prev) => {
      const map = new Map(prev)
      for (const file of next) {
        if (!map.has(file.name + file.lastModified)) {
          map.set(file.name + file.lastModified, URL.createObjectURL(file))
        }
      }
      return map
    })
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== index))
  }

  function clearAll() {
    cancelRef.current = true
    setFiles([])
    setResults([])
    setStats({ processed: 0, total: 0, avgLatency: 0 })
  }

  async function runDetection() {
    cancelRef.current = false
    setRunning(true)
    setResults([])
    const latencies: number[] = []
    const total = files.length
    setStats({ processed: 0, total, avgLatency: 0 })

    for (let index = 0; index < files.length; index += 1) {
      if (cancelRef.current) {
        break
      }
      const file = files[index]
      const started = performance.now()
      try {
        const result = await detectImage(file)
        const latency = performance.now() - started
        latencies.push(latency)
        const avgLatency =
          latencies.reduce((sum, value) => sum + value, 0) / latencies.length
        setStats({ processed: index + 1, total, avgLatency })

        setResults((prev) => [
          ...prev,
          {
            file,
            src: srcMap.get(file.name + file.lastModified) ?? '',
            result,
          },
        ])
      } catch {
        toast(`Detection failed: ${file.name}`, 'error')
        setResults((prev) => [
          ...prev,
          {
            file,
            src: srcMap.get(file.name + file.lastModified) ?? '',
            result: null,
            error: 'Failed',
          },
        ])
      }
    }

    setRunning(false)
  }

  const summary = useMemo(() => {
    let totalFaces = 0
    let women = 0
    let men = 0
    let unknown = 0
    let flagged = 0
    let totalProcessing = 0
    let processed = 0
    for (const item of results) {
      if (!item.result) {
        continue
      }
      processed += 1
      totalFaces += item.result.faces.length
      const counts = countFaces(item.result)
      women += counts.female
      men += counts.male
      unknown += counts.unknown
      if (item.result.nsfw.score > settings.nsfwThreshold) {
        flagged += 1
      }
      totalProcessing += item.result.processingTime.total
    }
    return {
      processed,
      totalFaces,
      women,
      men,
      unknown,
      flagged,
      avg: processed > 0 ? Math.round(totalProcessing / processed) : 0,
    }
  }, [results, settings.nsfwThreshold])

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      totalImages: results.length,
      settings,
      results: results
        .filter((item) => item.result)
        .map((item) => ({
          fileName: item.file.name,
          faces: item.result?.faces ?? [],
          nsfw: item.result?.nsfw,
          processingTime: item.result?.processingTime,
        })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'haramblur-batch-results.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const selected = selectedIndex !== null ? results[selectedIndex] : null

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-[#1e2d4a] bg-[#111827] p-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Grid3X3 className="h-5 w-5 text-emerald-500" />
          Batch Test
        </h1>
        <p className="mt-1 text-sm text-[#94a3b8]">
          Process up to 50 images for gender and NSFW detection
        </p>
      </header>

      {files.length === 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            setDragActive(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setDragActive(false)
            addFiles(Array.from(event.dataTransfer.files))
          }}
          className={`flex min-h-[220px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed bg-[#111827] text-center transition ${
            dragActive ? 'border-emerald-500' : 'border-[#1e2d4a]'
          }`}
        >
          <p className="text-base text-[#e2e8f0]">Drop images here or click to browse</p>
          <p className="mt-2 text-sm text-[#94a3b8]">
            Select up to 50 images - JPG, PNG, WebP - max 10MB each
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
          />
        </button>
      )}

      {files.length > 0 && (
        <div className="space-y-3 rounded-xl border border-[#1e2d4a] bg-[#111827] p-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {files.map((file, index) => {
              const key = file.name + file.lastModified
              const src = srcMap.get(key) ?? ''
              const done = index < results.length && !results[index].error
              const failed = index < results.length && !!results[index].error
              return (
                <div key={key} className="relative shrink-0">
                  <img
                    src={src}
                    alt={file.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute -right-1 -top-1 rounded-full bg-black/70 p-0.5 text-white"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {done && (
                    <span className="absolute bottom-1 right-1 rounded bg-emerald-500 px-1 text-[10px] text-[#0a0f1a]">
                      ✓
                    </span>
                  )}
                  {failed && (
                    <span className="absolute bottom-1 right-1 rounded bg-red-500 px-1 text-[10px] text-white">
                      ✗
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[#94a3b8]">{files.length} images selected</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-lg border border-[#1e2d4a] px-3 py-1 text-xs text-[#e2e8f0]"
              >
                Add More
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-lg border border-[#1e2d4a] px-3 py-1 text-xs text-[#94a3b8]"
              >
                Clear All
              </button>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
          />

          <button
            type="button"
            disabled={files.length === 0 || running}
            onClick={() => void runDetection()}
            className={`w-full rounded-lg py-2 text-sm font-semibold ${
              files.length === 0 || running
                ? 'cursor-not-allowed bg-[#1e2d4a] text-[#64748b]'
                : 'bg-emerald-500 text-[#0a0f1a] hover:bg-emerald-400'
            }`}
          >
            ▶ Run Detection
          </button>
        </div>
      )}

      {running && (
        <div className="space-y-2 rounded-xl border border-[#1e2d4a] bg-[#111827] p-4">
          <div className="flex items-center justify-between text-sm text-[#94a3b8]">
            <span>
              Processing image {Math.min(stats.processed + 1, stats.total)} of {stats.total}
            </span>
            <button
              type="button"
              onClick={() => {
                cancelRef.current = true
              }}
              className="text-red-400"
            >
              ✕ Cancel
            </button>
          </div>
          <div className="h-2 overflow-hidden rounded bg-[#1e2d4a]">
            <div
              className="h-full bg-emerald-500"
              style={{
                width: `${stats.total > 0 ? (stats.processed / stats.total) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="text-xs text-[#64748b]">
            {formatRemainingMs(stats.avgLatency * Math.max(0, stats.total - stats.processed))}
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="sticky top-0 z-20 grid grid-cols-2 gap-2 rounded-xl border border-[#1e2d4a] bg-[#111827] p-3 text-xs md:grid-cols-5">
          <span>📊 {summary.processed} Images</span>
          <span className="text-pink-400">♀ {summary.women} Women</span>
          <span className="text-blue-400">♂ {summary.men} Men</span>
          <span className="text-red-400">🔞 {summary.flagged} Flagged</span>
          <div className="flex items-center justify-between gap-2 md:justify-end">
            <span>⚡ {summary.avg}ms avg</span>
            <button
              type="button"
              onClick={exportJson}
              className="inline-flex items-center gap-1 rounded border border-[#1e2d4a] px-2 py-1"
            >
              <DownloadCloud className="h-3 w-3" />
              Export JSON
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {results.map((item, index) => {
          const counts = item.result ? countFaces(item.result) : { female: 0, male: 0, unknown: 0 }
          const score = item.result?.nsfw.score ?? 0
          const nsfwClass =
            score < 0.3
              ? 'bg-emerald-500/20 text-emerald-400'
              : score <= 0.7
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
          const nsfwText = score < 0.3 ? 'Safe' : score <= 0.7 ? 'Caution' : 'NSFW'
          const accentClass =
            counts.female > 0
              ? 'border-l-2 border-pink-500'
              : counts.male > 0
                ? 'border-l-2 border-blue-500'
                : ''

          return (
            <button
              key={item.file.name + item.file.lastModified}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`overflow-hidden rounded-xl border border-[#1e2d4a] bg-[#111827] text-left transition-transform hover:scale-[1.02] ${accentClass}`}
            >
              <img src={item.src} alt={item.file.name} className="aspect-[4/3] w-full object-cover" />
              <div className="flex items-center justify-between bg-black/60 p-2 text-xs">
                <span className="text-[#e2e8f0]">
                  ♀ {counts.female} ♂ {counts.male} ? {counts.unknown}
                </span>
                <span className={`rounded px-2 py-0.5 ${nsfwClass}`}>{nsfwText}</span>
              </div>
            </button>
          )
        })}
      </div>

      {!running && files.length > 0 && results.length > 0 && summary.processed === 0 && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          Detection failed for all images. Check backend.
        </div>
      )}

      {selected && selected.result && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelectedIndex(null)}
        >
          <div
            ref={modalRef}
            className="grid max-h-[90vh] w-full max-w-6xl grid-cols-1 gap-4 overflow-auto rounded-xl border border-[#1e2d4a] bg-[#111827] p-4 lg:grid-cols-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-3 lg:col-span-3">
              <DetectionCanvas
                imageSrc={selected.src}
                result={selected.result}
                settings={settings}
              />
              <BlurPreview
                imageSrc={selected.src}
                result={selected.result}
                settings={settings}
              />
            </div>
            <aside className="space-y-3 text-sm lg:col-span-2">
              {(() => {
                const counts = countFaces(selected.result)
                const blurred = selected.result.faces.filter((face) => {
                  if (settings.blurMode === 'off') {
                    return false
                  }
                  if (settings.blurMode === 'all_faces') {
                    return true
                  }
                  if (settings.blurMode === 'men_only') {
                    return face.gender === 'male' || face.gender === 'unknown'
                  }
                  return (
                    face.gender === 'female' ||
                    face.gender === 'unknown' ||
                    (face.gender === 'male' &&
                      face.genderConfidence < settings.genderThreshold)
                  )
                }).length
                return (
                  <>
                    <p className="text-pink-400">♀ Female: {counts.female}</p>
                    <p className="text-blue-400">♂ Male: {counts.male}</p>
                    <p className="text-yellow-400">? Unknown: {counts.unknown}</p>
                    <p className="text-[#94a3b8]">Blurred: {blurred} faces</p>
                  </>
                )
              })()}
              <div className="space-y-1 text-xs text-[#94a3b8]">
                <p>Face: {selected.result.processingTime.face}ms</p>
                <p>Gender: {selected.result.processingTime.gender}ms</p>
                <p>NSFW: {selected.result.processingTime.nsfw}ms</p>
                <p>Total: {selected.result.processingTime.total}ms</p>
              </div>
              <p className="text-xs text-[#64748b]">
                {selected.file.name} - {(selected.file.size / 1024).toFixed(1)}KB
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIndex((prev) => (prev !== null ? Math.max(0, prev - 1) : prev))}
                  className="rounded border border-[#1e2d4a] px-3 py-1 text-xs"
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedIndex((prev) =>
                      prev !== null ? Math.min(results.length - 1, prev + 1) : prev,
                    )
                  }
                  className="rounded border border-[#1e2d4a] px-3 py-1 text-xs"
                >
                  Next →
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIndex(null)}
                  className="ml-auto rounded border border-[#1e2d4a] px-3 py-1 text-xs"
                  aria-label="Close result modal"
                >
                  ✕
                </button>
              </div>
            </aside>
          </div>
        </div>
      )}
    </section>
  )
}
