# HaramBlur

HaramBlur is a privacy-first real-time face, gender, and NSFW content detection MVP for Islamic gaze protection. The app is designed to detect faces in images or video, classify each detected face by gender, score the full image for NSFW content, and apply blur overlays locally on-device.

## Team

- Majd: frontend development in `web/frontend`
- Fedi: backend development in `web/backend`

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Axios, React Router
- Backend: Express.js, TypeScript, Multer, Sharp, dotenv, CORS
- ML target: on-device face detection, gender classification, and NSFW inference

## Project Structure

```text
.
├── docs/
│   └── API.md
├── web/
│   ├── frontend/
│   └── backend/
└── README.md
```

## Frontend Setup

```bash
cd web/frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api` requests to the backend on `http://localhost:3001`.

## Backend Setup

```bash
cd web/backend
npm install
npm run dev
```

The backend runs on `http://localhost:3001`.

## API Contract

The shared frontend/backend contract lives in [docs/API.md](/C:/Users/Lenovo/Desktop/FarmHassanet/docs/API.md).

## Development Workflow

1. Start the backend from `web/backend`.
2. Start the frontend from `web/frontend`.
3. Keep frontend and backend types aligned with the API contract in `docs/API.md`.

## Notes

- Model files live in `web/backend/models` and are gitignored except for `.gitkeep`.
- Temporary uploads live in `web/backend/uploads` and are gitignored except for `.gitkeep`.
- Default blur mode is `women_only`, and unknown gender detections should be treated cautiously by default.
- This repository is being built as a 48-hour MVP sprint.
