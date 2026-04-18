import * as os from 'node:os'
import type { AddressInfo } from 'node:net'

import app from './app'
import { config } from './config'
import { nsfwDetector } from './services/nsfwDetector'

let faceDetectorModulePromise:
  | Promise<typeof import('./services/faceDetector')>
  | null = null

async function getFaceDetector() {
  if (!faceDetectorModulePromise) {
    faceDetectorModulePromise = import('./services/faceDetector')
  }
  return (await faceDetectorModulePromise).faceDetector
}

function getLocalIP(): string {
  const interfaces = os.networkInterfaces()
  for (const interfaceName of Object.keys(interfaces)) {
    const entries = interfaces[interfaceName]
    if (!entries) {
      continue
    }
    for (const entry of entries) {
      if (
        entry.family === 'IPv4' &&
        !entry.internal &&
        (entry.address.startsWith('192.168.') || entry.address.startsWith('10.'))
      ) {
        return entry.address
      }
    }
  }
  return 'unknown'
}

async function startServer(): Promise<void> {
  await nsfwDetector.initialize()
  const faceDetector = await getFaceDetector()
  await faceDetector.initialize()

  const server = app.listen(config.port, '0.0.0.0', () => {
    const localIP = getLocalIP()
    const address = server.address() as AddressInfo | null
    const port = address?.port ?? config.port

    console.log('===========================================')
    console.log('  HaramBlur API is RUNNING')
    console.log('===========================================')
    console.log(`  Local (React):     http://localhost:${port}`)
    console.log(`  Android Emulator:  http://10.0.2.2:${port}`)
    console.log(`  Android Device:    http://${localIP}:${port}`)
    console.log('===========================================')
    console.log(
      `  Face/Gender: ${faceDetector.getFaceStatus().loaded && faceDetector.getGenderStatus().loaded ? 'Ready' : 'Not loaded'}`,
    )
    console.log(`  NSFW:        ${nsfwDetector.getStatus().loaded ? 'Ready' : 'Not loaded'}`)
    console.log('===========================================\n')
  })

  const shutdown = () => {
    nsfwDetector.dispose()
    server.close(() => {
      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

void startServer().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
