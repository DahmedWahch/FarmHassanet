import * as canvas from 'canvas'
import * as faceapi from '@vladmandic/face-api/dist/face-api.node-wasm.js'
import * as tf from '@tensorflow/tfjs'
import * as fs from 'node:fs'
import * as path from 'node:path'

import { config } from '../config'
import type { FaceDetection } from '../types'

const { Canvas, Image, ImageData } = canvas
// face-api requires environment patching in Node.js runtime.
faceapi.env.monkeyPatch({ Canvas, Image, ImageData } as never)

class FaceDetectorService {
  private faceModelLoaded = false
  private genderModelLoaded = false
  private readonly modelPath: string
  private loadStartedAt: Date | null = null

  public constructor() {
    this.modelPath = path.resolve(config.faceModelPath)
  }

  public async initialize(): Promise<void> {
    this.loadStartedAt = new Date()
    console.log(`Loading face-api models from: ${this.modelPath}`)

    if (!fs.existsSync(this.modelPath)) {
      console.warn(`Model directory not found: ${this.modelPath}`)
      console.warn('Run: npm run download-models')
      return
    }

    try {
      await tf.setBackend('cpu')
      await tf.ready()
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(this.modelPath)
      this.faceModelLoaded = true
      console.log('  OK SSD-MobileNet loaded (face detection)')
    } catch (error) {
      console.error('  FAIL SSD-MobileNet failed to load:', error)
    }

    try {
      await faceapi.nets.ageGenderNet.loadFromDisk(this.modelPath)
      this.genderModelLoaded = true
      console.log('  OK AgeGenderNet loaded (gender classification)')
    } catch (error) {
      console.error('  FAIL AgeGenderNet failed to load:', error)
    }

    const elapsed = this.loadStartedAt
      ? Date.now() - this.loadStartedAt.getTime()
      : 0
    console.log(
      `Face/Gender model init finished (${elapsed}ms) | face=${this.faceModelLoaded} gender=${this.genderModelLoaded}\n`,
    )
  }

  public async detect(imagePath: string): Promise<{
    faces: FaceDetection[]
    processingTime: { face: number; gender: number }
  }> {
    if (!this.faceModelLoaded) {
      console.warn('Face model not loaded, returning empty results')
      return { faces: [], processingTime: { face: 0, gender: 0 } }
    }

    const image = await canvas.loadImage(imagePath)
    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 })

    const faceStart = Date.now()

    if (this.genderModelLoaded) {
      const detections = await faceapi
        .detectAllFaces(image as never, options)
        .withAgeAndGender()
      const faceTime = Date.now() - faceStart
      const genderStart = Date.now()

      const faces: FaceDetection[] = detections.map((detection) => {
        const box = detection.detection.box
        const rawGender = detection.gender
        const gender =
          rawGender === 'male'
            ? 'male'
            : rawGender === 'female'
              ? 'female'
              : 'unknown'

        return {
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
          confidence: Number(detection.detection.score.toFixed(4)),
          gender,
          genderConfidence: Number(detection.genderProbability.toFixed(4)),
        }
      })

      const genderTime = Date.now() - genderStart
      console.log(
        `Face detection: ${faces.length} face(s) | face=${faceTime}ms gender=${genderTime}ms`,
      )

      return { faces, processingTime: { face: faceTime, gender: genderTime } }
    }

    const detections = await faceapi.detectAllFaces(image as never, options)
    const faceTime = Date.now() - faceStart
    const faces: FaceDetection[] = detections.map((detection) => {
      const box = detection.box
      return {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
        confidence: Number(detection.score.toFixed(4)),
        gender: 'unknown',
        genderConfidence: 0,
      }
    })

    console.log(
      `Face detection: ${faces.length} face(s) | face=${faceTime}ms gender=0ms`,
    )

    return { faces, processingTime: { face: faceTime, gender: 0 } }
  }

  public getFaceStatus(): { loaded: boolean; name: string; size: string } {
    return {
      loaded: this.faceModelLoaded,
      name: 'SSD-MobileNet',
      size: this.faceModelLoaded ? '5.4MB' : '0',
    }
  }

  public getGenderStatus(): { loaded: boolean; name: string; size: string } {
    return {
      loaded: this.genderModelLoaded,
      name: 'AgeGenderNet',
      size: this.genderModelLoaded ? '2.1MB' : '0',
    }
  }
}

export const faceDetector = new FaceDetectorService()
