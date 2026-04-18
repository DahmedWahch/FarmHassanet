import type { AppSettings, DetectionResult, FaceDetection } from '../types'

interface StatsPanelProps {
  result: DetectionResult | null
  settings: AppSettings
  isLoading: boolean
}

function shouldBlurFace(face: FaceDetection, settings: AppSettings): boolean {
  if (!settings.detectFaces) {
    return false
  }

  if (settings.blurMode === 'off') {
    return false
  }

  if (settings.blurMode === 'all_faces') {
    return true
  }

  if (settings.blurMode === 'men_only') {
    return face.gender === 'male' || face.gender === 'unknown'
  }

  if (face.gender === 'female' || face.gender === 'unknown') {
    return true
  }

  return face.gender === 'male' && face.genderConfidence < settings.genderThreshold
}

function skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 rounded bg-[#1e2d4a]" />
      <div className="h-4 rounded bg-[#1e2d4a]" />
      <div className="h-6 rounded bg-[#1e2d4a]" />
      <div className="h-3 rounded bg-[#1e2d4a]" />
    </div>
  )
}

export function StatsPanel({ result, settings, isLoading }: StatsPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-[#1e2d4a] bg-[#111827] p-4">
        {skeleton()}
      </div>
    )
  }

  if (!result) {
    return (
      <div className="rounded-xl border border-[#1e2d4a] bg-[#111827] p-4 text-sm text-[#94a3b8]">
        Upload an image to get started
      </div>
    )
  }

  const women = result.faces.filter((face) => face.gender === 'female').length
  const men = result.faces.filter((face) => face.gender === 'male').length
  const unknown = result.faces.filter((face) => face.gender === 'unknown').length
  const nsfwOverridesAll = settings.detectNsfw && result.nsfw.score >= settings.nsfwThreshold
  const blurred = nsfwOverridesAll
    ? result.faces.length
    : result.faces.filter((face) => shouldBlurFace(face, settings)).length

  return (
    <div className="space-y-4 rounded-xl border border-[#1e2d4a] bg-[#111827] p-4 text-sm">
      <p className="text-[#e2e8f0]">
        <span className="text-pink-500">Women: {women}</span>
        <span className="text-[#64748b]"> | </span>
        <span className="text-blue-500">Men: {men}</span>
        <span className="text-[#64748b]"> | </span>
        <span className="text-amber-400">Unknown: {unknown}</span>
      </p>

      <p className="text-[#94a3b8]">Blurred: {blurred} faces</p>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-lg border border-[#1e2d4a] px-2 py-1 text-[#94a3b8]">
          Face: {result.processingTime.face}ms
        </span>
        <span className="rounded-lg border border-[#1e2d4a] px-2 py-1 text-[#94a3b8]">
          Gender: {result.processingTime.gender}ms
        </span>
        <span className="rounded-lg border border-[#1e2d4a] px-2 py-1 text-[#94a3b8]">
          NSFW: {result.processingTime.nsfw}ms
        </span>
        <span className="rounded-lg border border-[#1e2d4a] px-2 py-1 text-[#94a3b8]">
          Total: {result.processingTime.total}ms
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[#94a3b8]">
          <span>NSFW Score</span>
          <span>{result.nsfw.score.toFixed(2)}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500">
          <div
            className="h-full bg-[#111827]"
            style={{
              width: `${Math.max(0, Math.min(100, result.nsfw.score * 100))}%`,
              marginLeft: 'auto',
            }}
          />
        </div>
      </div>
    </div>
  )
}
