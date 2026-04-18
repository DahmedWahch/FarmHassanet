import { Camera } from 'lucide-react'

export function WebcamTest() {
  return (
    <section className="rounded-xl border border-[#1e2d4a] bg-[#111827] p-8 text-center">
      <Camera className="mx-auto mb-3 h-8 w-8 text-[#64748b]" />
      <h1 className="text-xl font-semibold text-[#e2e8f0]">Webcam Test</h1>
      <p className="mt-2 text-sm text-[#94a3b8]">
        Real-time webcam detection will be implemented in MAJD-3.
      </p>
    </section>
  )
}
