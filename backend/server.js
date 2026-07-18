import compression from 'compression'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { ZodError } from 'zod'
import { executePlan, listFiles, undoLastOperation } from './executor.js'
import {
  createPlan,
  executeRequestSchema,
  planRequestSchema,
} from './planner.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 3000)

app.use(helmet())
app.use(compression())
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

app.get('/health', (_req, res) => {
  res.json({
    data: {
      ok: true,
      service: 'file-automation',
      timestamp: new Date().toISOString(),
    },
  })
})

app.get('/files', async (_req, res, next) => {
  try {
    res.json({ data: { files: await listFiles() } })
  } catch (error) {
    next(error)
  }
})

app.post('/plan', async (req, res, next) => {
  try {
    const { command } = planRequestSchema.parse(req.body)
    res.json({ data: { plan: await createPlan(command) } })
  } catch (error) {
    next(error)
  }
})

app.post('/execute', async (req, res, next) => {
  try {
    const { plan } = executeRequestSchema.parse(req.body)
    res.json({ data: await executePlan(plan) })
  } catch (error) {
    next(error)
  }
})

app.post('/undo', async (_req, res, next) => {
  try {
    res.json({ data: await undoLastOperation() })
  } catch (error) {
    next(error)
  }
})

app.use((req, _res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`)
  error.status = 404
  error.code = 'NOT_FOUND'
  next(error)
})

app.use((error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: error.issues[0]?.message || 'Invalid request',
        code: 'VALIDATION_ERROR',
      },
    })
  }

  console.error(error)

  return res.status(error.status || 500).json({
    error: {
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
    },
  })
})

const server = app.listen(port, () => {
  console.log(`File automation API listening on port ${port}`)
})

export default app
export { server }
