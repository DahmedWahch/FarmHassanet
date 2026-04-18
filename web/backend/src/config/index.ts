import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: Number(process.env.PORT || 3001),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxFileSize: Number.parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  faceModelPath: process.env.FACE_MODEL_PATH || 'models/face-api',
  nsfwModelPath: process.env.NSFW_MODEL_PATH || 'models/nsfw',
}
