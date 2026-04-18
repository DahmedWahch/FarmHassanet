import { memo, useEffect, useRef } from 'react'

import type { AppSettings, DetectionResult, FaceDetection } from '../types'

interface DetectionCanvasProps {
  imageSrc: string
  result: DetectionResult | null
  settings: AppSettings
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

function faceColor(face: FaceDetection): string {
  if (face.gender === 'female') {
    return '#ec4899'
  }
  if (face.gender === 'male') {
    return '#3b82f6'
  }
  return '#f59e0b'
}

function faceLabel(face: FaceDetection): string {
  if (face.gender === 'female') {
    return `Female ${Math.round(face.genderConfidence * 100)}%`
  }
  if (face.gender === 'male') {
    return `Male ${Math.round(face.genderConfidence * 100)}%`
  }
  return 'Unknown'
}

function DetectionCanvasComponent({ imageSrc, result, settings }: DetectionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const image = new Image()
    image.src = imageSrc
    image.onload = () => {
      imageRef.current = image
      drawCanvas()
    }
    imageRef.current = image
    return () => {
      imageRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc])

  useEffect(() => {
    drawCanvas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, settings])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const observer = new ResizeObserver(() => {
      drawCanvas()
    })
    observer.observe(container)
    return () => {
      observer.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function drawCanvas() {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image || image.width === 0 || image.height === 0) {
      return
    }

    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0)

    if (!result) {
      return
    }

    const nsfwUnsafe = result.nsfw.score >= settings.nsfwThreshold

    for (const face of result.faces) {
      const color = faceColor(face)
      const blur = nsfwUnsafe || shouldBlurFace(face, settings)

      context.save()
      context.strokeStyle = color
      context.lineWidth = 2
      context.setLineDash(blur ? [] : [5, 5])
      context.strokeRect(face.x, face.y, face.width, face.height)
      context.restore()

      const label = faceLabel(face)
      context.font = '12px sans-serif'
      const textWidth = context.measureText(label).width
      const paddingX = 8
      const labelWidth = textWidth + paddingX * 2
      const labelHeight = 22
      const labelX = face.x
      const labelY = Math.max(0, face.y - labelHeight - 6)

      context.fillStyle = color
      context.fillRect(labelX, labelY, labelWidth, labelHeight)
      context.fillStyle = '#0a0f1a'
      context.fillText(label, labelX + paddingX, labelY + 15)
    }

    const badgeText = `${nsfwUnsafe ? 'NSFW' : 'Safe'} ${result.nsfw.score.toFixed(2)}`
    const badgeColor = nsfwUnsafe ? '#ef4444' : '#10b981'

    context.font = 'bold 12px sans-serif'
    const badgeWidth = context.measureText(badgeText).width + 20
    const badgeHeight = 26
    const badgeX = canvas.width - badgeWidth - 12
    const badgeY = 12
    context.fillStyle = badgeColor
    context.fillRect(badgeX, badgeY, badgeWidth, badgeHeight)
    context.fillStyle = '#ffffff'
    context.fillText(badgeText, badgeX + 10, badgeY + 17)
  }

  return (
    <div
      ref={containerRef}
      className="mx-auto w-full max-w-[800px] overflow-hidden rounded-xl border border-[#1e2d4a] bg-[#111827]"
    >
      <canvas
        ref={canvasRef}
        className="h-auto w-full"
        role="img"
        aria-label="Detection results"
      />
    </div>
  )
}

export const DetectionCanvas = memo(
  DetectionCanvasComponent,
  (prev, next) =>
    prev.imageSrc === next.imageSrc &&
    prev.result === next.result &&
    prev.settings.blurMode === next.settings.blurMode &&
    prev.settings.genderThreshold === next.settings.genderThreshold &&
    prev.settings.nsfwThreshold === next.settings.nsfwThreshold &&
    prev.settings.detectFaces === next.settings.detectFaces &&
    prev.settings.detectNsfw === next.settings.detectNsfw,
)
