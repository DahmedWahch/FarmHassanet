import { mkdir } from 'node:fs/promises'

async function main(): Promise<void> {
  await Promise.all([mkdir('models', { recursive: true }), mkdir('uploads', { recursive: true })])

  console.log('Model directories are ready.')
  console.log('Download placeholder only: add actual model download logic here when the model URLs are finalized.')
}

void main().catch((error: unknown) => {
  console.error('Failed to prepare model directories.', error)
  process.exitCode = 1
})
