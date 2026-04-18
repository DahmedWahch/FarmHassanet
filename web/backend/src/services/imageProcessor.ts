import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as crypto from 'node:crypto'

import { config } from '../config'

function normalizeBase64Payload(input: string): string {
  const marker = 'base64,'
  const markerIndex = input.indexOf(marker)
  if (markerIndex >= 0) {
    return input.slice(markerIndex + marker.length)
  }
  return input
}

export async function writeBase64ImageToTemp(base64Input: string): Promise<string> {
  const payload = normalizeBase64Payload(base64Input)
  const buffer = Buffer.from(payload, 'base64')

  if (buffer.length === 0) {
    throw new Error('Base64 payload is empty or invalid.')
  }

  await fs.mkdir(config.uploadDir, { recursive: true })
  const filename = `batch-${Date.now()}-${crypto.randomUUID()}.jpg`
  const filePath = path.resolve(config.uploadDir, filename)
  await fs.writeFile(filePath, buffer)
  return filePath
}

export async function removeTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath)
  } catch {
    // ignore cleanup failures
  }
}
