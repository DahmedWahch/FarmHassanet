import type { ModelsStatus } from '../types'

export function getModelStatus(): ModelsStatus {
  return {
    faceModel: {
      loaded: false,
      name: 'SSD-MobileNet',
      size: '5.4MB',
    },
    genderModel: {
      loaded: false,
      name: 'AgeGenderNet',
      size: '2.1MB',
    },
    nsfwModel: {
      loaded: false,
      name: 'OpenNSFW-v2',
      size: '24MB',
    },
  }
}
