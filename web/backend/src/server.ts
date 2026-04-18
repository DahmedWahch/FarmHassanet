import app from './app'
import { config } from './config'

app.listen(config.port, () => {
  console.log(`HaramBlur API running on http://localhost:${config.port}`)
  console.log(`CORS origin: ${config.corsOrigin}`)
})
