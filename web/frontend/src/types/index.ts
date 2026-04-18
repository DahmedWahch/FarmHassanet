export interface FaceDetection {
  x: number
  y: number
  width: number
  height: number
  confidence: number
  gender: 'male' | 'female' | 'unknown'
  genderConfidence: number
}

export interface NsfwResult {
  score: number
  label: 'sfw' | 'nsfw'
}

export interface ProcessingTime {
  face: number
  gender: number
  nsfw: number
  total: number
}

export interface DetectionResult {
  faces: FaceDetection[]
  nsfw: NsfwResult
  processingTime: ProcessingTime
}

export interface BatchDetectionRequest {
  images: string[]
}

export interface BatchDetectionResponse {
  results: DetectionResult[]
}

export interface ModelStatusItem {
  loaded: boolean
  name: string
  size: string
}

export interface ModelsStatus {
  faceModel: ModelStatusItem
  genderModel: ModelStatusItem
  nsfwModel: ModelStatusItem
}

export interface AppSettings {
  nsfwThreshold: number
  blurIntensity: number
  detectFaces: boolean
  detectNsfw: boolean
  blurMode: 'all_faces' | 'women_only' | 'men_only' | 'off'
  genderThreshold: number
}

export interface ApiErrorResponse {
  error: string
  code: string
}
