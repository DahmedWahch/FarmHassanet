import * as canvas from 'canvas'
import * as nsfw from 'nsfwjs'
import * as tf from '@tensorflow/tfjs'

import { getSettings } from './settings-service'

class NsfwDetectorService {
  private model: nsfw.NSFWJS | null = null
  private isLoaded = false

  public async initialize(): Promise<void> {
    try {
      console.log('Loading NSFW model...')
      console.log('  First run downloads ~24MB. This may take a minute.')
      await tf.setBackend('cpu')
      await tf.ready()
      this.model = await nsfw.load()
      this.isLoaded = true
      console.log('  OK NSFW model ready\n')
    } catch (error) {
      console.error('Failed to load NSFW model:', error)
      console.warn('NSFW detection will return score=0 (not blocking).')
      this.isLoaded = false
      this.model = null
    }
  }

  public async classify(imagePath: string): Promise<{
    score: number
    label: 'sfw' | 'nsfw'
    processingTime: number
  }> {
    if (!this.model || !this.isLoaded) {
      return { score: 0, label: 'sfw', processingTime: 0 }
    }

    const startedAt = Date.now()

    let predictions: nsfw.PredictionType[]
    let tensor: tf.Tensor3D | null = null
    try {
      const image = await canvas.loadImage(imagePath)
      const previewCanvas = canvas.createCanvas(image.width, image.height)
      const context = previewCanvas.getContext('2d')
      context.drawImage(image, 0, 0, previewCanvas.width, previewCanvas.height)
      tensor = tf.browser.fromPixels(previewCanvas as never, 3) as tf.Tensor3D

      predictions = await this.model.classify(tensor)
    } catch (error) {
      const processingTime = Date.now() - startedAt
      console.error('NSFW classification failed, returning safe fallback:', error)
      return { score: 0, label: 'sfw', processingTime }
    } finally {
      tensor?.dispose()
    }

    const probability = (className: string): number =>
      predictions.find((item) => item.className === className)?.probability ?? 0

    const porn = probability('Porn')
    const sexy = probability('Sexy')
    const hentai = probability('Hentai')
    const neutral = probability('Neutral')

    const score = Number((porn + sexy + hentai).toFixed(4))
    const { nsfwThreshold } = getSettings()
    const label: 'sfw' | 'nsfw' = score >= nsfwThreshold ? 'nsfw' : 'sfw'
    const processingTime = Date.now() - startedAt

    console.log(
      `NSFW: score=${score.toFixed(3)} label=${label} (${processingTime}ms) [Porn=${porn.toFixed(2)} Sexy=${sexy.toFixed(2)} Hentai=${hentai.toFixed(2)} Neutral=${neutral.toFixed(2)}]`,
    )

    if (Math.random() < 0.1) {
      const memory = tf.memory()
      console.log(
        `  TF Memory: ${memory.numTensors} tensors, ${(memory.numBytes / 1024 / 1024).toFixed(1)}MB`,
      )
    }

    return { score, label, processingTime }
  }

  public getStatus(): { loaded: boolean; name: string; size: string } {
    return {
      loaded: this.isLoaded,
      name: 'NSFWJS-MobileNetV2',
      size: this.isLoaded ? '24MB' : '0',
    }
  }

  public dispose(): void {
    this.model = null
    this.isLoaded = false
    console.log('NSFW model disposed')
  }
}

export const nsfwDetector = new NsfwDetectorService()
