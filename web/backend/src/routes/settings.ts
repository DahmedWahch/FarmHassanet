import { Router } from 'express'

import { getSettings, updateSettings, validateSettings } from '../services/settings-service'

const settingsRouter = Router()

settingsRouter.get('/', (_request, response) => {
  console.log('Settings requested.')
  response.json(getSettings())
})

settingsRouter.post('/', (request, response) => {
  console.log('Settings update requested.')

  const validation = validateSettings(request.body)

  if (!validation.valid) {
    response.status(400).json({
      error: validation.error,
      code: 'INVALID_SETTINGS',
    })
    return
  }

  response.json(updateSettings(validation.value))
})

export { settingsRouter }
