import app from './app.js'
import { env } from './utils/env.js'

const server = app.listen(env.PORT, () => {
  console.log(`File automation API listening on port ${env.PORT}`)
})

export default server
