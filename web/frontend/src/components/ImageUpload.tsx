import { Camera, Loader2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ImageUploadProps {
  onImageSelected: (file: File) => void
  isLoading: boolean
}

interface ToastState {
  id: number
  message: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

export function ImageUpload({ onImageSelected, isLoading }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [webcamOpen, setWebcamOpen] = useState(false)
  const [webcamLoading, setWebcamLoading] = useState(false)
  const [webcamError, setWebcamError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  function showToast(message: string) {
    setToast({ id: Date.now(), message })
  }

  useEffect(() => {
    if (!toast) {
      return
    }

    const timeout = window.setTimeout(() => {
      setToast((prev) => (prev?.id === toast.id ? null : prev))
    }, 3000)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [toast])

  useEffect(() => {
    return () => {
      if (previewSrc) {
        URL.revokeObjectURL(previewSrc)
      }
    }
  }, [previewSrc])

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const files = event.clipboardData?.files
      const file = files && files.length > 0 ? files[0] : null
      if (!file) {
        return
      }
      void handleFile(file)
    }

    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('paste', onPaste)
    }
  }, [])

  function stopWebcam() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  useEffect(() => {
    if (!webcamOpen) {
      stopWebcam()
      setWebcamError(null)
    }
  }, [webcamOpen])

  async function handleFile(file: File) {
    if (!isImageFile(file)) {
      showToast('Invalid file type. Please select an image file.')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast('File is too large. Maximum size is 10MB.')
      return
    }

    setPreviewSrc((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev)
      }
      return URL.createObjectURL(file)
    })

    onImageSelected(file)
  }

  async function startWebcam() {
    setWebcamLoading(true)
    setWebcamError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setWebcamError('Unable to access webcam. Check camera permissions.')
    } finally {
      setWebcamLoading(false)
    }
  }

  async function captureFromWebcam() {
    const video = videoRef.current
    const canvas = captureCanvasRef.current

    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      showToast('Webcam is not ready yet. Please try again.')
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    if (!context) {
      showToast('Unable to capture image from webcam.')
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    })

    if (!blob) {
      showToast('Capture failed. Please try again.')
      return
    }

    const file = new File([blob], `webcam-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    })
    await handleFile(file)
    setWebcamOpen(false)
  }

  return (
    <div className="space-y-3">
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-lg border border-red-500/30 bg-red-500/15 px-4 py-2 text-sm text-red-200 shadow-lg">
          {toast.message}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setWebcamOpen(true)
            void startWebcam()
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-[#1e2d4a] bg-[#111827] px-3 py-2 text-sm text-[#e2e8f0] transition hover:border-emerald-500/70 hover:text-emerald-500"
        >
          <Camera className="h-4 w-4" />
          Capture from Webcam
        </button>
      </div>

      <div
        role="button"
        tabIndex={0}
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
          const file = event.dataTransfer.files.item(0)
          if (!file) {
            return
          }
          void handleFile(file)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={`relative min-h-[300px] cursor-pointer overflow-hidden rounded-xl border-2 border-dashed bg-[#111827] transition ${
          dragActive ? 'border-emerald-500' : 'border-[#1e2d4a]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.item(0)
            if (!file) {
              return
            }
            void handleFile(file)
          }}
        />

        {!previewSrc && (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 px-4 text-center">
            <Upload className="h-10 w-10 text-[#64748b]" />
            <p className="text-base font-medium text-[#e2e8f0]">
              Drop an image here or click to browse
            </p>
            <p className="text-sm text-[#94a3b8]">
              Supports JPG, PNG, WebP up to 10MB
            </p>
            <p className="text-xs text-[#64748b]">You can also paste an image with Ctrl+V</p>
          </div>
        )}

        {previewSrc && (
          <img
            src={previewSrc}
            alt="Uploaded preview"
            className="h-full min-h-[300px] w-full object-contain"
          />
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0f1a]/60">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        )}
      </div>

      {webcamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-[#1e2d4a] bg-[#111827] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#e2e8f0]">Capture from Webcam</h3>
              <button
                type="button"
                className="rounded-lg p-1 text-[#94a3b8] transition hover:bg-[#1e2d4a]/40 hover:text-[#e2e8f0]"
                onClick={() => setWebcamOpen(false)}
                aria-label="Close webcam modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#1e2d4a] bg-black">
              <video ref={videoRef} autoPlay muted playsInline className="h-auto w-full" />
            </div>

            {webcamLoading && (
              <div className="mt-3 flex items-center gap-2 text-sm text-[#94a3b8]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Starting camera...</span>
              </div>
            )}

            {webcamError && <p className="mt-3 text-sm text-red-300">{webcamError}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setWebcamOpen(false)}
                className="rounded-lg border border-[#1e2d4a] px-4 py-2 text-sm text-[#e2e8f0] transition hover:bg-[#1e2d4a]/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void captureFromWebcam()}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#0a0f1a] transition hover:bg-emerald-400"
              >
                Capture
              </button>
            </div>

            <canvas ref={captureCanvasRef} className="hidden" />
          </div>
        </div>
      )}
    </div>
  )
}
