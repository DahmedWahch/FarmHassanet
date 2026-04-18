import cors from 'cors'
import express from 'express'

import { errorHandler } from './middleware/error-handler'
import { notFoundHandler } from './middleware/not-found'
import { detectRouter } from './routes/detect'
import { modelsRouter } from './routes/models'
import { settingsRouter } from './routes/settings'

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://10.0.2.2:3001',
]

const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true)
      return
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    if (/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}/.test(origin)) {
      callback(null, true)
      return
    }

    if (/^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(origin)) {
      callback(null, true)
      return
    }

    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
})

const app = express()

app.use(corsMiddleware)
app.options(/.*/, corsMiddleware)

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use((request, response, next) => {
  const startedAt = Date.now()
  const originalSend = response.send.bind(response)

  response.send = ((body?: unknown) => {
    const duration = Date.now() - startedAt
    response.setHeader('X-Response-Time', `${duration}ms`)
    return originalSend(body as never)
  }) as typeof response.send

  response.on('finish', () => {
    const duration = Date.now() - startedAt
    console.log(
      `[${new Date().toISOString()}] ${request.method} ${request.path} -> ${response.statusCode} (${duration}ms)`,
    )
  })
  next()
})

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/detect', detectRouter)
app.use('/api/models', modelsRouter)
app.use('/api/settings', settingsRouter)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
