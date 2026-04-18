import { Router } from 'express'

import { getModelStatus } from '../services/model-service'

const modelsRouter = Router()

modelsRouter.get('/status', (_request, response) => {
  console.log('Model status requested.')
  response.json(getModelStatus())
})

export { modelsRouter }
