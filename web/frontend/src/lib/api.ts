import axios from 'axios'

import type {
  AppSettings,
  BatchDetectionResponse,
  DetectionResult,
  ModelsStatus,
} from '../types'

export const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export async function detectImage(file: File): Promise<DetectionResult> {
  const formData = new FormData()
  formData.append('image', file)

  const response = await api.post<DetectionResult>('/detect', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}

export async function detectBatch(
  images: string[],
): Promise<BatchDetectionResponse> {
  const response = await api.post<BatchDetectionResponse>(
    '/detect/batch',
    { images },
  )

  return response.data
}

export async function getModelsStatus(): Promise<ModelsStatus> {
  const response = await api.get<ModelsStatus>('/models/status')

  return response.data
}

export async function getSettings(): Promise<AppSettings> {
  const response = await api.get<AppSettings>('/settings')

  return response.data
}

export async function updateSettings(
  settings: Partial<AppSettings>,
): Promise<AppSettings> {
  const response = await api.post<AppSettings>('/settings', settings)

  return response.data
}
