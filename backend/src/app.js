import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import automationRoutes from './routes/automationRoutes.js'
import healthRoutes from './routes/healthRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import { env } from './utils/env.js'

const app = express()

app.use(helmet())
app.use(compression())
app.use(cors({ origin: env.CLIENT_ORIGIN }))
app.use(express.json({ limit: '1mb' }))
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))

app.use('/health', healthRoutes)
app.use('/', automationRoutes)

app.use(notFound)
app.use(errorHandler)

export default app
