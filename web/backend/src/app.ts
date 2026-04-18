import cors from 'cors'
import express, { type RequestHandler } from 'express'

import { config } from './config'
import { errorHandler } from './middleware/error-handler'
import { notFoundHandler } from './middleware/not-found'
import { detectRouter } from './routes/detect'
import { modelsRouter } from './routes/models'
import { settingsRouter } from './routes/settings'

const requestLogger: RequestHandler = (request, _response, next) => {
  console.log(`Incoming request: ${request.method} ${request.originalUrl}`)
  next()
}

const app = express()

app.use(
  cors({
    origin: config.corsOrigin,
  }),
)
app.use(express.json({ limit: '50mb' }))
app.use(requestLogger)

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.use('/api/detect', detectRouter)
app.use('/api/models', modelsRouter)
app.use('/api/settings', settingsRouter)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
