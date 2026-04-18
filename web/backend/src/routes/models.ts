import { Router } from 'express'

import { nsfwDetector } from '../services/nsfwDetector'

const modelsRouter = Router()
let faceDetectorModulePromise:
  | Promise<typeof import('../services/faceDetector')>
  | null = null

async function getFaceDetector() {
  if (!faceDetectorModulePromise) {
    faceDetectorModulePromise = import('../services/faceDetector')
  }
  return (await faceDetectorModulePromise).faceDetector
}

modelsRouter.get('/status', async (_request, response) => {
  console.log('Model status requested.')
  try {
    const faceDetector = await getFaceDetector()
    response.json({
      faceModel: faceDetector.getFaceStatus(),
      genderModel: faceDetector.getGenderStatus(),
      nsfwModel: nsfwDetector.getStatus(),
    })
  } catch (error) {
    console.error('Failed to fetch model status:', error)
    response.status(500).json({
      error: 'Failed to read model status.',
      code: 'MODEL_STATUS_ERROR',
    })
  }
})

export { modelsRouter }
