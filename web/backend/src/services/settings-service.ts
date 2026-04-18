import type { AppSettings } from '../types'

type ValidationResult =
  | { valid: true; value: Partial<AppSettings> }
  | { valid: false; error: string }

const defaultSettings: AppSettings = {
  nsfwThreshold: 0.5,
  blurIntensity: 85,
  detectFaces: true,
  detectNsfw: true,
  blurMode: 'women_only',
  genderThreshold: 0.6,
}

let currentSettings: AppSettings = { ...defaultSettings }

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isBlurMode(value: unknown): value is AppSettings['blurMode'] {
  return value === 'all_faces' || value === 'women_only' || value === 'men_only'
}

export function getSettings(): AppSettings {
  return { ...currentSettings }
}

export function validateSettings(input: unknown): ValidationResult {
  if (!isObject(input)) {
    return { valid: false, error: 'Settings payload must be a JSON object.' }
  }

  const nextSettings: Partial<AppSettings> = {}

  if ('nsfwThreshold' in input) {
    if (
      !isNumber(input.nsfwThreshold) ||
      input.nsfwThreshold < 0 ||
      input.nsfwThreshold > 1
    ) {
      return {
        valid: false,
        error: 'nsfwThreshold must be a number between 0 and 1.',
      }
    }

    nextSettings.nsfwThreshold = input.nsfwThreshold
  }

  if ('blurIntensity' in input) {
    if (
      !isNumber(input.blurIntensity) ||
      input.blurIntensity < 0 ||
      input.blurIntensity > 100
    ) {
      return {
        valid: false,
        error: 'blurIntensity must be a number between 0 and 100.',
      }
    }

    nextSettings.blurIntensity = input.blurIntensity
  }

  if ('detectFaces' in input) {
    if (!isBoolean(input.detectFaces)) {
      return {
        valid: false,
        error: 'detectFaces must be a boolean value.',
      }
    }

    nextSettings.detectFaces = input.detectFaces
  }

  if ('detectNsfw' in input) {
    if (!isBoolean(input.detectNsfw)) {
      return {
        valid: false,
        error: 'detectNsfw must be a boolean value.',
      }
    }

    nextSettings.detectNsfw = input.detectNsfw
  }

  if ('blurMode' in input) {
    if (!isBlurMode(input.blurMode)) {
      return {
        valid: false,
        error: 'blurMode must be one of all_faces, women_only, or men_only.',
      }
    }

    nextSettings.blurMode = input.blurMode
  }

  if ('genderThreshold' in input) {
    if (
      !isNumber(input.genderThreshold) ||
      input.genderThreshold < 0 ||
      input.genderThreshold > 1
    ) {
      return {
        valid: false,
        error: 'genderThreshold must be a number between 0 and 1.',
      }
    }

    nextSettings.genderThreshold = input.genderThreshold
  }

  return { valid: true, value: nextSettings }
}

export function updateSettings(nextSettings: Partial<AppSettings>): AppSettings {
  // Keep scaffold settings in memory until persistence is added.
  currentSettings = {
    ...currentSettings,
    ...nextSettings,
  }

  return getSettings()
}
