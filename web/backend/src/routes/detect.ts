import type { DetectionResult } from '../types'
import { Router } from 'express'

import type { BatchDetectionRequest } from '../types'
import { upload } from '../middleware/upload'

const detectRouter = Router()

const emptyDetectionResult: DetectionResult = {
  faces: [],
  nsfw: {
    score: 0,
    label: 'sfw',
  },
  processingTime: {
    face: 0,
    gender: 0,
    nsfw: 0,
    total: 0,
  },
}

detectRouter.post('/', upload.single('image'), (request, response) => {
  console.log('Single-image detection request received.')

  if (!request.file) {
    response.status(400).json({
      error: 'Image file is required in the "image" form field.',
      code: 'MISSING_IMAGE',
    })
    return
  }

  response.json(emptyDetectionResult)
})

detectRouter.post('/batch', (request, response) => {
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

  response.json({
    results: body.images.map(() => emptyDetectionResult),
  })
})

export { detectRouter }
