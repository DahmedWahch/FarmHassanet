import * as fs from 'node:fs'
import * as http from 'node:http'
import * as https from 'node:https'
import * as path from 'node:path'

const MODEL_DIR = path.resolve('models/face-api')
const BASE_URL =
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'

const FILES = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'age_gender_model-weights_manifest.json',
  'age_gender_model-shard1',
]

async function downloadFile(url: string, destination: string): Promise<void> {
  if (fs.existsSync(destination)) {
    console.log(`  -> Already exists: ${path.basename(destination)}`)
    return
  }

  await new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(destination)
    const protocol = url.startsWith('https') ? https : http

    const request = protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close()
        if (fs.existsSync(destination)) {
          fs.unlinkSync(destination)
        }
        const location = response.headers.location
        if (!location) {
          reject(new Error(`Redirect without location for ${url}`))
          return
        }
        downloadFile(location, destination).then(resolve).catch(reject)
        return
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} for ${url}`))
        return
      }

      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    })

    request.on('error', (error) => {
      if (fs.existsSync(destination)) {
        fs.unlinkSync(destination)
      }
      reject(error)
    })
  })
}

async function main(): Promise<void> {
  if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true })
    console.log(`Created: ${MODEL_DIR}`)
  }

  console.log('Downloading face-api models...\n')

  for (const fileName of FILES) {
    const url = `${BASE_URL}/${fileName}`
    const destination = path.join(MODEL_DIR, fileName)
    process.stdout.write(`  v ${fileName}...`)

    try {
      await downloadFile(url, destination)
      process.stdout.write(' ok\n')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      process.stdout.write(` failed: ${message}\n`)
      console.log(`    Manual download: curl -L "${url}" -o "${destination}"`)
    }
  }

  console.log('\nDone. Run: npm run dev')
}

void main().catch((error: unknown) => {
  console.error('Failed to download models:', error)
  process.exitCode = 1
})
