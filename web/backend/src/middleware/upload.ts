import multer from 'multer'

import { config } from '../config'

export const upload = multer({
  dest: config.uploadDir,
  limits: {
    fileSize: config.maxFileSize,
  },
})
