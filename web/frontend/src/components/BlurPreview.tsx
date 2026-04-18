import { memo, useEffect, useRef, useState } from 'react'

import type { AppSettings, DetectionResult, FaceDetection } from '../types'

interface BlurPreviewProps {
  imageSrc: string
  result: DetectionResult | null
  settings: AppSettings
}

function shouldBlurFace(face: FaceDetection, settings: AppSettings): boolean {
  if (!settings.detectFaces || settings.blurMode === 'off') {
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

function BlurPreviewComponent({ imageSrc, result, settings }: BlurPreviewProps) {
  const [showOriginal, setShowOriginal] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const image = new Image()
    image.src = imageSrc
    image.onload = () => {
      imageRef.current = image
      draw()
    }
    imageRef.current = image
    return () => {
      imageRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc])

  useEffect(() => {
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, result, showOriginal])

  function draw() {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image || image.width === 0 || image.height === 0) {
      return
    }
    canvas.width = image.width
    canvas.height = image.height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.filter = 'none'
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    if (!result || showOriginal) {
      return
    }

    if (settings.detectFaces) {
      for (const face of result.faces) {
        if (!shouldBlurFace(face, settings)) {
          continue
        }
        ctx.save()
        ctx.beginPath()
        ctx.rect(face.x, face.y, face.width, face.height)
        ctx.clip()
        ctx.filter = `blur(${Math.round(settings.blurIntensity / 4)}px)`
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        ctx.restore()
      }
    }

    if (settings.detectNsfw && result.nsfw.score >= settings.nsfwThreshold) {
      ctx.save()
      ctx.filter = `blur(${Math.round(settings.blurIntensity / 2.5)}px)`
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      ctx.restore()
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('NSFW Content Detected', canvas.width / 2, canvas.height / 2)
      ctx.textAlign = 'start'
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#1e2d4a] bg-[#111827]">
      <button
        type="button"
        onClick={() => setShowOriginal((prev) => !prev)}
        className="absolute left-3 top-3 z-10 rounded-lg border border-[#1e2d4a] bg-[#0a0f1a]/70 px-3 py-1 text-xs text-[#e2e8f0] transition hover:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {showOriginal ? 'Show Blurred' : 'Show Original'}
      </button>
      <canvas ref={canvasRef} className="h-auto w-full transition-opacity duration-200" />
    </div>
  )
}

export const BlurPreview = memo(
  BlurPreviewComponent,
  (prev, next) =>
    prev.imageSrc === next.imageSrc &&
    prev.result === next.result &&
    prev.settings.blurMode === next.settings.blurMode &&
    prev.settings.blurIntensity === next.settings.blurIntensity &&
    prev.settings.nsfwThreshold === next.settings.nsfwThreshold &&
    prev.settings.genderThreshold === next.settings.genderThreshold &&
    prev.settings.detectFaces === next.settings.detectFaces &&
    prev.settings.detectNsfw === next.settings.detectNsfw,
)
