# HaramBlur API Contract

This document is the shared contract between the frontend and backend. Both sides must match these request and response shapes exactly.

## Detection Pipeline

Each detection request follows this sequence:

1. Face detection returns bounding boxes for all faces.
2. Gender classification returns `male`, `female`, or `unknown` per face.
3. NSFW classification returns an image-level safety score.

Frontend blur logic:

- `blurMode: "women_only"` blurs female faces and treats `unknown` as female for safety.
- `blurMode: "all_faces"` blurs every face.
- `blurMode: "men_only"` blurs male faces.
- If the NSFW score exceeds the configured threshold, the entire image should be blurred regardless of face settings.

## `POST /api/detect`

Request:

- Content type: `multipart/form-data`
- File field name: `image`

Response:

```json
{
  "faces": [
    {
      "x": 120,
      "y": 80,
      "width": 150,
      "height": 180,
      "confidence": 0.94,
      "gender": "female",
      "genderConfidence": 0.89
    },
    {
      "x": 400,
      "y": 90,
      "width": 140,
      "height": 170,
      "confidence": 0.91,
      "gender": "male",
      "genderConfidence": 0.95
    }
  ],
  "nsfw": {
    "score": 0.12,
    "label": "sfw"
  },
  "processingTime": {
    "face": 45,
    "gender": 30,
    "nsfw": 120,
    "total": 208
  }
}
```

## `POST /api/detect/batch`

Request:

- Content type: `application/json`

Body:

```json
{
  "images": ["base64string1", "base64string2"]
}
```

Constraints:

- Maximum 20 images per request

Response:

```json
{
  "results": [
    {
      "faces": [
        {
          "x": 120,
          "y": 80,
          "width": 150,
          "height": 180,
          "confidence": 0.94,
          "gender": "female",
          "genderConfidence": 0.89
        }
      ],
      "nsfw": {
        "score": 0.12,
        "label": "sfw"
      },
      "processingTime": {
        "face": 45,
        "gender": 30,
        "nsfw": 120,
        "total": 208
      }
    }
  ]
}
```

## `GET /api/models/status`

Response:

```json
{
  "faceModel": {
    "loaded": true,
    "name": "SSD-MobileNet",
    "size": "5.4MB"
  },
  "genderModel": {
    "loaded": true,
    "name": "AgeGenderNet",
    "size": "2.1MB"
  },
  "nsfwModel": {
    "loaded": true,
    "name": "OpenNSFW-v2",
    "size": "24MB"
  }
}
```

## `GET /api/settings`

Response:

```json
{
  "nsfwThreshold": 0.5,
  "blurIntensity": 85,
  "detectFaces": true,
  "detectNsfw": true,
  "blurMode": "women_only",
  "genderThreshold": 0.6
}
```

## `POST /api/settings`

Request:

- Content type: `application/json`
- Body may include any subset of the settings object above

Response:

```json
{
  "nsfwThreshold": 0.5,
  "blurIntensity": 85,
  "detectFaces": true,
  "detectNsfw": true,
  "blurMode": "women_only",
  "genderThreshold": 0.6
}
```

## Error Response Format

All `4xx` and `5xx` responses must use:

```json
{
  "error": "Human readable message",
  "code": "ERROR_CODE"
}
```

## TypeScript Interfaces

```ts
interface FaceDetection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  gender: 'male' | 'female' | 'unknown';
  genderConfidence: number;
}

interface NsfwResult {
  score: number;
  label: 'sfw' | 'nsfw';
}

interface ProcessingTime {
  face: number;
  gender: number;
  nsfw: number;
  total: number;
}

interface DetectionResult {
  faces: FaceDetection[];
  nsfw: NsfwResult;
  processingTime: ProcessingTime;
}

interface ModelStatusItem {
  loaded: boolean;
  name: string;
  size: string;
}

interface ModelsStatus {
  faceModel: ModelStatusItem;
  genderModel: ModelStatusItem;
  nsfwModel: ModelStatusItem;
}

interface AppSettings {
  nsfwThreshold: number;
  blurIntensity: number;
  detectFaces: boolean;
  detectNsfw: boolean;
  blurMode: 'all_faces' | 'women_only' | 'men_only';
  genderThreshold: number;
}
```
