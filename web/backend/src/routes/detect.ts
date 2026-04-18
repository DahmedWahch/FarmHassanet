import { Router } from 'express'

import { upload } from '../middleware/upload'
import {
  removeTempFile,
  writeBase64ImageToTemp,
} from '../services/imageProcessor'
import { nsfwDetector } from '../services/nsfwDetector'
import type {
  BatchDetectionRequest,
  DetectionResult,
} from '../types'

const detectRouter = Router()
let faceDetectorModulePromise:
  | Promise<typeof import('../services/faceDetector')>
  | null = null

async function getFaceDetector() {
  if (!faceDetectorModulePromise) {
    faceDetectorModulePromise = import('../services/faceDetector')
  }
  return (await faceDetectorModulePromise).faceDetector
}

async function runDetection(imagePath: string): Promise<DetectionResult> {
  const totalStart = Date.now()
  const faceDetector = await getFaceDetector()

  const [faceResultPromise, nsfwResultPromise] = await Promise.allSettled([
    faceDetector.detect(imagePath),
    nsfwDetector.classify(imagePath),
  ])

  const faceResult =
    faceResultPromise.status === 'fulfilled'
      ? faceResultPromise.value
      : { faces: [], processingTime: { face: 0, gender: 0 } }
  const nsfwResult =
    nsfwResultPromise.status === 'fulfilled'
      ? nsfwResultPromise.value
      : { score: 0, label: 'sfw' as const, processingTime: 0 }

  if (faceResultPromise.status === 'rejected') {
    console.error('Face detection failed, returning empty faces:', faceResultPromise.reason)
  }
  if (nsfwResultPromise.status === 'rejected') {
    console.error('NSFW detection failed, returning safe fallback:', nsfwResultPromise.reason)
  }

  return {
    faces: faceResult.faces,
    nsfw: {
      score: nsfwResult.score,
      label: nsfwResult.label,
    },
    processingTime: {
      face: faceResult.processingTime.face,
      gender: faceResult.processingTime.gender,
      nsfw: nsfwResult.processingTime,
      total: Date.now() - totalStart,
    },
  }
}

detectRouter.post('/', upload.single('image'), async (request, response) => {
  console.log('Single-image detection request received.')

  if (!request.file) {
    response.status(400).json({
      error: 'Image file is required in the "image" form field.',
      code: 'MISSING_IMAGE',
    })
    return
  }

  const imagePath = request.file.path
  try {
    const result = await runDetection(imagePath)
    response.json(result)
  } catch (error) {
    console.error('Failed to process single-image detection:', error)
    response.status(500).json({
      error: 'Failed to process detection request.',
      code: 'DETECTION_FAILED',
    })
  } finally {
    await removeTempFile(imagePath)
  }
})

detectRouter.post('/batch', async (request, response) => {
  console.log('Batch detection request received.')

  const body = request.body as Partial<BatchDetectionRequest>

  if (!Array.isArray(body.images)) {
    response.status(400).json({
      error: 'Request body must include an images array.',
      code: 'INVALID_BATCH_REQUEST',
    })
    return
  }

  if (body.images.length > 20) {
    response.status(400).json({
      error: 'A maximum of 20 images is allowed per batch request.',
      code: 'BATCH_LIMIT_EXCEEDED',
    })
    return
  }

  if (!body.images.every((item) => typeof item === 'string')) {
    response.status(400).json({
      error: 'Each image entry must be a base64 string.',
      code: 'INVALID_BATCH_IMAGE',
    })
    return
  }

  const results: DetectionResult[] = []

  try {
    for (const base64 of body.images) {
      const tempPath = await writeBase64ImageToTemp(base64)
      try {
        const result = await runDetection(tempPath)
        results.push(result)
      } finally {
        await removeTempFile(tempPath)
      }
    }
  } catch (error) {
    console.error('Failed to process batch detection:', error)
    response.status(500).json({
      error: 'Failed to process batch detection request.',
      code: 'BATCH_DETECTION_FAILED',
    })
    return
  }

  response.json({ results })
})

export { detectRouter }
